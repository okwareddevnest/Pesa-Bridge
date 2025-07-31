const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

class MpesaService {
  constructor() {
    this.baseUrl = process.env.MPESA_ENVIRONMENT === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke';
    
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.businessShortCode = process.env.MPESA_BUSINESS_SHORT_CODE;
    this.passkey = process.env.MPESA_PASSKEY;
    this.phoneNumber = process.env.MPESA_PHONE_NUMBER;
    
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      const response = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));
      
      logger.info('M-Pesa access token refreshed');
      return this.accessToken;
    } catch (error) {
      logger.error('Failed to get M-Pesa access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with M-Pesa API');
    }
  }

  generateTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  generatePassword() {
    const timestamp = this.generateTimestamp();
    const password = `${this.businessShortCode}${this.passkey}${timestamp}`;
    return Buffer.from(password).toString('base64');
  }

  async initiateSTKPush(phoneNumber, amount, reference, description) {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword();

      const payload = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        PartyA: phoneNumber,
        PartyB: this.businessShortCode,
        PhoneNumber: phoneNumber,
        CallBackURL: `${process.env.MPESA_CALLBACK_URL || process.env.TAILSCALE_FUNNEL_URL}/api/webhooks/mpesa/stk-callback`,
        AccountReference: reference,
        TransactionDesc: description
      };

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('STK Push initiated successfully', {
        checkoutRequestID: response.data.CheckoutRequestID,
        merchantRequestID: response.data.MerchantRequestID,
        reference: reference
      });

      return {
        success: true,
        checkoutRequestID: response.data.CheckoutRequestID,
        merchantRequestID: response.data.MerchantRequestID,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription
      };

    } catch (error) {
      logger.error('STK Push failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message
      };
    }
  }

  async querySTKPushStatus(checkoutRequestID) {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword();

      const payload = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID
      };

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        resultCode: response.data.ResultCode,
        resultDescription: response.data.ResultDesc,
        checkoutRequestID: response.data.CheckoutRequestID,
        merchantRequestID: response.data.MerchantRequestID
      };

    } catch (error) {
      logger.error('STK Push query failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.message
      };
    }
  }

  validateWebhookSignature(signature, timestamp, nonce, body) {
    const appSecret = process.env.MPESA_CONSUMER_SECRET;
    const signatureBase = `${appSecret}&${timestamp}&${nonce}`;
    const expectedSignature = crypto.createHash('sha256').update(signatureBase).digest('hex');
    
    return signature === expectedSignature;
  }

  parseSTKCallback(body) {
    try {
      const result = body.Body.stkCallback;
      return {
        checkoutRequestID: result.CheckoutRequestID,
        merchantRequestID: result.MerchantRequestID,
        resultCode: result.ResultCode,
        resultDescription: result.ResultDesc,
        amount: result.CallbackMetadata?.Item?.find(item => item.Name === 'Amount')?.Value,
        mpesaReceiptNumber: result.CallbackMetadata?.Item?.find(item => item.Name === 'MpesaReceiptNumber')?.Value,
        transactionDate: result.CallbackMetadata?.Item?.find(item => item.Name === 'TransactionDate')?.Value,
        phoneNumber: result.CallbackMetadata?.Item?.find(item => item.Name === 'PhoneNumber')?.Value
      };
    } catch (error) {
      logger.error('Failed to parse STK callback:', error);
      throw new Error('Invalid callback data format');
    }
  }

  mapMpesaResultToCardResponse(resultCode, resultDescription) {
    switch (resultCode) {
      case 0:
        return {
          approved: true,
          authorizationCode: this.generateAuthorizationCode(),
          responseCode: '00',
          responseDescription: 'Approved'
        };
      case 1:
        return {
          approved: false,
          declineCode: '51',
          declineReason: 'Insufficient funds'
        };
      case 2:
        return {
          approved: false,
          declineCode: '05',
          declineReason: 'Declined'
        };
      case 1032:
        return {
          approved: false,
          declineCode: '13',
          declineReason: 'Invalid amount'
        };
      case 1037:
        return {
          approved: false,
          declineCode: '12',
          declineReason: 'Invalid transaction'
        };
      case 2001:
        return {
          approved: false,
          declineCode: '14',
          declineReason: 'Invalid card number'
        };
      case 2002:
        return {
          approved: false,
          declineCode: '15',
          declineReason: 'Invalid card'
        };
      default:
        return {
          approved: false,
          declineCode: '96',
          declineReason: resultDescription || 'System malfunction'
        };
    }
  }

  generateAuthorizationCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}

module.exports = new MpesaService(); 