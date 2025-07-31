const Transaction = require('../models/Transaction');
const VirtualCard = require('../models/VirtualCard');
const User = require('../models/User');
const cardService = require('./cardService');
const mpesaService = require('./mpesaService');
const logger = require('../utils/logger');
const cache = require('../utils/cache');
const { v4: uuidv4 } = require('uuid');

class AuthorizationService {
  async authorizeTransaction(transactionData) {
    const {
      card_number,
      cvv,
      expiry_month,
      expiry_year,
      amount,
      currency = 'KES',
      merchant_name,
      merchant_id,
      merchant_category
    } = transactionData;

    try {
      // Validate card
      const validation = await cardService.validateCard(card_number, cvv, expiry_month, expiry_year);
      if (!validation.valid) {
        return {
          approved: false,
          decline_code: '14',
          decline_reason: validation.reason,
          transaction_reference: this.generateTransactionReference()
        };
      }

      const card = validation.card;
      const userId = validation.user_id;

      // Get user
      const user = await User.findByPk(userId);
      if (!user || !user.is_active) {
        return {
          approved: false,
          decline_code: '15',
          decline_reason: 'Cardholder account inactive',
          transaction_reference: this.generateTransactionReference()
        };
      }

      // Convert amount to KES if needed
      const amountKES = currency === 'KES' ? amount : await this.convertCurrency(amount, currency, 'KES');

      // Check transaction limits
      const userLimitCheck = user.canMakeTransaction(amountKES);
      if (!userLimitCheck.allowed) {
        return {
          approved: false,
          decline_code: '51',
          decline_reason: userLimitCheck.reason,
          transaction_reference: this.generateTransactionReference()
        };
      }

      const cardLimitCheck = card.canMakeTransaction(amountKES);
      if (!cardLimitCheck.allowed) {
        return {
          approved: false,
          decline_code: '51',
          decline_reason: cardLimitCheck.reason,
          transaction_reference: this.generateTransactionReference()
        };
      }

      // Check for fraud patterns
      const fraudCheck = await cardService.checkFraudPatterns(card.id, { amount: amountKES });
      if (fraudCheck.suspicious) {
        logger.warn('Suspicious transaction detected', {
          cardId: card.id,
          indicators: fraudCheck.indicators,
          amount: amountKES
        });
      }

      // Create transaction record
      const transaction = await Transaction.create({
        user_id: userId,
        card_id: card.id,
        transaction_reference: this.generateTransactionReference(),
        amount: amount,
        currency: currency,
        amount_kes: amountKES,
        merchant_name: merchant_name,
        merchant_id: merchant_id,
        merchant_category: merchant_category,
        status: 'pending_authorization',
        metadata: {
          fraud_indicators: fraudCheck.indicators,
          ip_address: transactionData.ip_address,
          user_agent: transactionData.user_agent
        }
      });

      // Set timeout for transaction
      transaction.setTimeout(0.5); // 30 seconds
      await transaction.save();

      // Initiate M-Pesa STK Push
      const stkResult = await mpesaService.initiateSTKPush(
        user.mpesa_phone,
        amountKES,
        transaction.transaction_reference,
        `Payment to ${merchant_name}`
      );

      if (!stkResult.success) {
        await transaction.updateStatus('failed', { error: stkResult.error });
        return {
          approved: false,
          decline_code: '96',
          decline_reason: 'Payment service unavailable',
          transaction_reference: transaction.transaction_reference
        };
      }

      // Update transaction with STK push details
      await transaction.updateStatus('stk_push_sent', {
        mpesa_checkout_request_id: stkResult.checkoutRequestID,
        mpesa_merchant_request_id: stkResult.merchantRequestID
      });

      // Cache transaction for quick lookup
      await cache.set(`transaction:${transaction.id}`, JSON.stringify({
        id: transaction.id,
        status: transaction.status,
        checkout_request_id: stkResult.checkoutRequestID
      }), 'EX', 1800); // 30 minutes

      logger.info('Transaction authorization initiated', {
        transactionId: transaction.id,
        cardId: card.id,
        userId: userId,
        amount: amountKES,
        merchant: merchant_name
      });

      return {
        approved: false, // Pending user response
        pending: true,
        transaction_reference: transaction.transaction_reference,
        checkout_request_id: stkResult.checkoutRequestID,
        message: 'STK push sent to your phone. Please complete the payment.'
      };

    } catch (error) {
      logger.error('Transaction authorization error:', error);
      return {
        approved: false,
        decline_code: '96',
        decline_reason: 'System error',
        transaction_reference: this.generateTransactionReference()
      };
    }
  }

  async handleSTKCallback(callbackData) {
    try {
      const {
        checkoutRequestID,
        resultCode,
        resultDescription,
        mpesaReceiptNumber,
        transactionDate,
        phoneNumber
      } = callbackData;

      // Find transaction by checkout request ID
      const transaction = await Transaction.findOne({
        where: { mpesa_checkout_request_id: checkoutRequestID }
      });

      if (!transaction) {
        logger.error('Transaction not found for STK callback', { checkoutRequestID });
        return { success: false, error: 'Transaction not found' };
      }

      // Get card and user
      const card = await VirtualCard.findByPk(transaction.card_id);
      const user = await User.findByPk(transaction.user_id);

      if (!card || !user) {
        logger.error('Card or user not found for transaction', { transactionId: transaction.id });
        return { success: false, error: 'Card or user not found' };
      }

      // Map M-Pesa result to card response
      const cardResponse = mpesaService.mapMpesaResultToCardResponse(resultCode, resultDescription);

      if (cardResponse.approved) {
        // Transaction approved
        await transaction.updateStatus('approved', {
          mpesa_result_code: resultCode,
          mpesa_result_desc: resultDescription,
          mpesa_transaction_id: mpesaReceiptNumber,
          authorization_code: cardResponse.authorizationCode
        });

        // Update card spending
        card.updateSpending(transaction.amount_kes);
        await card.save();

        // Update user daily spent
        user.total_daily_spent += transaction.amount_kes;
        await user.save();

        logger.info('Transaction approved', {
          transactionId: transaction.id,
          mpesaReceiptNumber,
          amount: transaction.amount_kes
        });

      } else {
        // Transaction declined
        await transaction.updateStatus('declined', {
          mpesa_result_code: resultCode,
          mpesa_result_desc: resultDescription,
          decline_reason: cardResponse.declineReason,
          decline_code: cardResponse.declineCode
        });

        logger.info('Transaction declined', {
          transactionId: transaction.id,
          reason: cardResponse.declineReason,
          code: cardResponse.declineCode
        });
      }

      // Remove from cache
      await cache.del(`transaction:${transaction.id}`);

      return {
        success: true,
        transaction_id: transaction.id,
        approved: cardResponse.approved,
        authorization_code: cardResponse.authorizationCode,
        decline_code: cardResponse.declineCode,
        decline_reason: cardResponse.declineReason
      };

    } catch (error) {
      logger.error('STK callback handling error:', error);
      return { success: false, error: error.message };
    }
  }

  async queryTransactionStatus(transactionReference) {
    try {
      const transaction = await Transaction.findOne({
        where: { transaction_reference: transactionReference }
      });

      if (!transaction) {
        return { success: false, error: 'Transaction not found' };
      }

      // If transaction is still pending, check M-Pesa status
      if (['stk_push_sent', 'awaiting_user_response'].includes(transaction.status)) {
        if (transaction.isExpired()) {
          await transaction.updateStatus('expired');
          return {
            success: true,
            status: 'expired',
            message: 'Transaction expired'
          };
        }

        // Query M-Pesa for status
        const mpesaStatus = await mpesaService.querySTKPushStatus(transaction.mpesa_checkout_request_id);
        
        if (mpesaStatus.success && mpesaStatus.resultCode !== 1032) { // 1032 = Request timeout
          // Handle the result
          await this.handleSTKCallback({
            checkoutRequestID: transaction.mpesa_checkout_request_id,
            resultCode: mpesaStatus.resultCode,
            resultDescription: mpesaStatus.resultDescription
          });
        }
      }

      return {
        success: true,
        status: transaction.status,
        transaction_reference: transaction.transaction_reference,
        amount: transaction.amount,
        currency: transaction.currency,
        merchant_name: transaction.merchant_name,
        created_at: transaction.created_at,
        completed_at: transaction.completed_at
      };

    } catch (error) {
      logger.error('Transaction status query error:', error);
      return { success: false, error: error.message };
    }
  }

  async convertCurrency(amount, fromCurrency, toCurrency) {
    try {
      if (fromCurrency === toCurrency) return amount;

      // For now, use a simple conversion rate
      // In production, you'd use a real currency API
      const rates = {
        USD: 150, // 1 USD = 150 KES
        EUR: 165, // 1 EUR = 165 KES
        GBP: 190  // 1 GBP = 190 KES
      };

      if (fromCurrency === 'KES') {
        return amount / rates[toCurrency];
      } else if (toCurrency === 'KES') {
        return amount * rates[fromCurrency];
      } else {
        // Convert to KES first, then to target currency
        const kesAmount = amount * rates[fromCurrency];
        return kesAmount / rates[toCurrency];
      }
    } catch (error) {
      logger.error('Currency conversion error:', error);
      return amount; // Return original amount if conversion fails
    }
  }

  generateTransactionReference() {
    return `TXN${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
}

module.exports = new AuthorizationService(); 