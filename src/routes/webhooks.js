const express = require('express');
const crypto = require('crypto');
const logger = require('../utils/logger');
const Transaction = require('../models/Transaction');
const VirtualCard = require('../models/VirtualCard');
const cache = require('../utils/cache');

const router = express.Router();

// M-Pesa webhook signature validation
const validateMpesaSignature = (req, res, next) => {
  try {
    const signature = req.headers['x-mpesa-signature'];
    const timestamp = req.headers['x-mpesa-timestamp'];
    const nonce = req.headers['x-mpesa-nonce'];
    
    if (!signature || !timestamp || !nonce) {
      logger.warn('M-Pesa webhook missing required headers', {
        signature: !!signature,
        timestamp: !!timestamp,
        nonce: !!nonce
      });
      return res.status(400).json({ error: 'Missing required headers' });
    }

    // In production, validate the signature using M-Pesa's public key
    // For development, we'll log the signature for debugging
    logger.info('M-Pesa webhook signature received', {
      signature: signature.substring(0, 20) + '...',
      timestamp,
      nonce
    });

    next();
  } catch (error) {
    logger.error('Error validating M-Pesa signature:', error);
    res.status(500).json({ error: 'Signature validation failed' });
  }
};

// M-Pesa STK Push callback
router.post('/mpesa', validateMpesaSignature, async (req, res) => {
  try {
    const { Body } = req.body;
    
    if (!Body) {
      logger.warn('M-Pesa webhook missing Body');
      return res.status(400).json({ error: 'Missing Body' });
    }

    const stkCallback = Body.stkCallback;
    
    if (!stkCallback) {
      logger.warn('M-Pesa webhook missing stkCallback');
      return res.status(400).json({ error: 'Missing stkCallback' });
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata
    } = stkCallback;

    logger.info('M-Pesa STK Push callback received', {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc
    });

    // Find the pending transaction
    const transaction = await Transaction.findOne({
      mpesaRequestId: MerchantRequestID,
      status: 'pending'
    });

    if (!transaction) {
      logger.warn('Transaction not found for M-Pesa callback', {
        MerchantRequestID,
        CheckoutRequestID
      });
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (ResultCode === 0) {
      // Success - extract payment details
      const metadata = CallbackMetadata?.Item || [];
      const mpesaReceiptNumber = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
      const amount = metadata.find(item => item.Name === 'Amount')?.Value;
      const phoneNumber = metadata.find(item => item.Name === 'PhoneNumber')?.Value;

      // Update transaction
      transaction.status = 'approved';
      transaction.mpesaReceiptNumber = mpesaReceiptNumber;
      transaction.processedAt = new Date();
      transaction.metadata = {
        ...transaction.metadata,
        mpesaAmount: amount,
        mpesaPhoneNumber: phoneNumber,
        callbackReceived: true
      };

      await transaction.save();

      // Update card balance if this is a card funding transaction
      if (transaction.type === 'card_funding') {
        const card = await VirtualCard.findById(transaction.cardId);
        if (card) {
          card.balance += amount;
          await card.save();
          logger.info('Card balance updated', {
            cardId: card._id,
            newBalance: card.balance
          });
        }
      }

      // Cache the successful transaction
      await cache.setex(
        `transaction:${transaction._id}`,
        3600, // 1 hour
        JSON.stringify(transaction)
      );

      logger.info('M-Pesa transaction processed successfully', {
        transactionId: transaction._id,
        mpesaReceiptNumber,
        amount
      });

    } else {
      // Failed transaction
      transaction.status = 'declined';
      transaction.processedAt = new Date();
      transaction.metadata = {
        ...transaction.metadata,
        failureReason: ResultDesc,
        callbackReceived: true
      };

      await transaction.save();

      logger.warn('M-Pesa transaction failed', {
        transactionId: transaction._id,
        resultCode: ResultCode,
        resultDesc: ResultDesc
      });
    }

    // Send success response to M-Pesa
    res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Success'
    });

  } catch (error) {
    logger.error('Error processing M-Pesa webhook:', error);
    res.status(500).json({
      ResultCode: 1,
      ResultDesc: 'Internal server error'
    });
  }
});

// M-Pesa C2B callback (for testing)
router.post('/mpesa/c2b', async (req, res) => {
  try {
    const { TransID, TransAmount, MSISDN, BillReferenceNumber } = req.body;
    
    logger.info('M-Pesa C2B callback received', {
      TransID,
      TransAmount,
      MSISDN,
      BillReferenceNumber
    });

    // Process C2B payment
    // This would typically update a transaction or create a new one
    
    res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Success'
    });

  } catch (error) {
    logger.error('Error processing M-Pesa C2B webhook:', error);
    res.status(500).json({
      ResultCode: 1,
      ResultDesc: 'Internal server error'
    });
  }
});

// B2C callback (for refunds/payouts)
router.post('/mpesa/b2c', async (req, res) => {
  try {
    const { Result } = req.body;
    
    logger.info('M-Pesa B2C callback received', {
      Result
    });

    // Process B2C result
    // This would typically update a payout transaction
    
    res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Success'
    });

  } catch (error) {
    logger.error('Error processing M-Pesa B2C webhook:', error);
    res.status(500).json({
      ResultCode: 1,
      ResultDesc: 'Internal server error'
    });
  }
});

// Webhook health check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    webhooks: {
      stkPush: '/mpesa',
      c2b: '/mpesa/c2b',
      b2c: '/mpesa/b2c'
    }
  });
});

// Webhook test endpoint (for development)
router.post('/test', (req, res) => {
  logger.info('Test webhook received', req.body);
  res.status(200).json({
    message: 'Test webhook received successfully',
    timestamp: new Date().toISOString(),
    data: req.body
  });
});

module.exports = router; 