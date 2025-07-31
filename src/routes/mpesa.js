const express = require('express');
const mpesaService = require('../services/mpesaService');
const logger = require('../utils/logger');

const router = express.Router();

// @route   POST /api/mpesa/test-stk
// @desc    Test STK push (for development)
// @access  Private
router.post('/test-stk', async (req, res) => {
  try {
    const { phone_number, amount, reference, description } = req.body;

    if (!phone_number || !amount || !reference) {
      return res.status(400).json({
        success: false,
        message: 'phone_number, amount, and reference are required'
      });
    }

    const result = await mpesaService.initiateSTKPush(
      phone_number,
      amount,
      reference,
      description || 'Test payment'
    );

    if (result.success) {
      logger.info('Test STK push initiated', {
        phoneNumber: phone_number,
        amount: amount,
        reference: reference
      });

      res.json({
        success: true,
        message: 'STK push initiated successfully',
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to initiate STK push',
        error: result.error
      });
    }

  } catch (error) {
    logger.error('Test STK push error:', error);
    res.status(500).json({
      success: false,
      message: 'System error during STK push test'
    });
  }
});

// @route   GET /api/mpesa/status
// @desc    Get M-Pesa service status
// @access  Private
router.get('/status', async (req, res) => {
  try {
    // Test access token generation
    const accessToken = await mpesaService.getAccessToken();

    res.json({
      success: true,
      data: {
        status: 'connected',
        environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
        access_token: accessToken ? 'valid' : 'invalid',
        business_short_code: process.env.MPESA_BUSINESS_SHORT_CODE,
        phone_number: process.env.MPESA_PHONE_NUMBER
      }
    });

  } catch (error) {
    logger.error('M-Pesa status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check M-Pesa status',
      error: error.message
    });
  }
});

module.exports = router; 