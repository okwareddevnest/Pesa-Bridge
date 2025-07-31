const express = require('express');
const { query, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const VirtualCard = require('../models/VirtualCard');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/transactions
// @desc    Get user's transaction history
// @access  Private
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['pending', 'approved', 'declined', 'failed']).withMessage('Invalid status'),
  query('type').optional().isIn(['purchase', 'card_funding', 'refund']).withMessage('Invalid transaction type'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.user.id;
    const {
      page = 1,
      limit = 20,
      status,
      type,
      startDate,
      endDate
    } = req.query;

    // Build query
    const query = { user_id: userId };
    
    if (status) {
      query.status = status;
    }
    
    if (type) {
      query.type = type;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('card_id', 'cardholder_name')
        .lean(),
      Transaction.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });

  } catch (error) {
    logger.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    });
  }
});

// @route   GET /api/transactions/:id
// @desc    Get specific transaction details
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const transactionId = req.params.id;

    const transaction = await Transaction.findOne({ _id: transactionId, user_id: userId })
      .populate('card_id', 'cardholder_name')
      .lean();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: transaction
    });

  } catch (error) {
    logger.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction'
    });
  }
});

// @route   POST /api/transactions
// @desc    Create a new transaction (for testing/development)
// @access  Private
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      cardId,
      amount,
      merchantName,
      merchantId,
      type = 'purchase',
      currency = 'KES'
    } = req.body;

    // Validate required fields
    if (!cardId || !amount || !merchantName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: cardId, amount, merchantName'
      });
    }

    // Verify card belongs to user
    const card = await VirtualCard.findOne({ _id: cardId, user_id: userId });
    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'Card not found'
      });
    }

    // Check card status
    if (card.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Card is not active'
      });
    }

    // Generate unique transaction reference
    const transactionReference = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create transaction
    const transaction = new Transaction({
      user_id: userId,
      card_id: cardId,
      transaction_reference: transactionReference,
      amount: parseFloat(amount),
      currency,
      amount_kes: parseFloat(amount), // Assuming KES for now
      status: 'pending_authorization',
      merchant_name: merchantName,
      merchant_id: merchantId,
      metadata: {
        createdBy: 'api',
        timestamp: new Date().toISOString()
      }
    });

    await transaction.save();

    logger.info('Transaction created', {
      userId,
      transactionId: transaction._id,
      amount,
      merchantName
    });

    res.status(201).json({
      success: true,
      data: transaction,
      message: 'Transaction created successfully'
    });

  } catch (error) {
    logger.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create transaction'
    });
  }
});

// @route   GET /api/transactions/export
// @desc    Export transactions as CSV
// @access  Private
router.get('/export', async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, status, type } = req.query;

    // Build query
    const query = { user_id: userId };
    
    if (status) {
      query.status = status;
    }
    
    if (type) {
      query.type = type;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .populate('card_id', 'cardholder_name')
      .lean();

    // Generate CSV
    const csvHeader = 'Date,Transaction ID,Type,Amount,Currency,Status,Merchant,Card Holder\n';
    const csvRows = transactions.map(t => {
      const date = new Date(t.createdAt).toLocaleDateString();
      const cardHolder = t.card_id?.cardholder_name || 'N/A';
      return `${date},${t._id},${t.type || 'purchase'},${t.amount},${t.currency},${t.status},${t.merchant_name || 'N/A'},${cardHolder}`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=transactions-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);

  } catch (error) {
    logger.error('Export transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export transactions'
    });
  }
});

// @route   GET /api/transactions/stats
// @desc    Get transaction statistics
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '30' } = req.query;
    
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get transaction statistics
    const stats = await Transaction.aggregate([
      {
        $match: {
          user_id: userId,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          approvedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          declinedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'declined'] }, 1, 0] }
          },
          pendingTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          approvedAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalTransactions: 0,
      totalAmount: 0,
      approvedTransactions: 0,
      declinedTransactions: 0,
      pendingTransactions: 0,
      approvedAmount: 0
    };

    // Calculate success rate
    const processedTransactions = result.approvedTransactions + result.declinedTransactions;
    const successRate = processedTransactions > 0 ? 
      (result.approvedTransactions / processedTransactions) * 100 : 0;

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        totalTransactions: result.totalTransactions,
        totalAmount: result.totalAmount,
        approvedTransactions: result.approvedTransactions,
        declinedTransactions: result.declinedTransactions,
        pendingTransactions: result.pendingTransactions,
        approvedAmount: result.approvedAmount,
        successRate: Math.round(successRate * 100) / 100
      }
    });

  } catch (error) {
    logger.error('Get transaction stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction statistics'
    });
  }
});

module.exports = router; 