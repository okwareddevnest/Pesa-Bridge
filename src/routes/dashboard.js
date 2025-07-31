const express = require('express');
const Transaction = require('../models/Transaction');
const VirtualCard = require('../models/VirtualCard');
const User = require('../models/User');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/dashboard/overview
// @desc    Get dashboard overview statistics
// @access  Private
router.get('/overview', async (req, res) => {
  try {
    const userId = req.user.id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get current period stats
    const currentStats = await Promise.all([
      Transaction.countDocuments({ user_id: userId }),
      Transaction.aggregate([
        { $match: { user_id: userId, status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      VirtualCard.countDocuments({ user_id: userId }),
      Transaction.countDocuments({ user_id: userId, status: 'approved' }),
      Transaction.countDocuments({ user_id: userId, status: 'declined' })
    ]);

    // Get previous period stats for comparison
    const previousStats = await Promise.all([
      Transaction.countDocuments({ 
        user_id: userId, 
        createdAt: { $lt: thirtyDaysAgo } 
      }),
      Transaction.aggregate([
        { 
          $match: { 
            user_id: userId, 
            status: 'approved',
            createdAt: { $lt: thirtyDaysAgo }
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      VirtualCard.countDocuments({ 
        user_id: userId, 
        createdAt: { $lt: thirtyDaysAgo } 
      }),
      Transaction.countDocuments({ 
        user_id: userId, 
        status: 'approved',
        createdAt: { $lt: thirtyDaysAgo }
      }),
      Transaction.countDocuments({ 
        user_id: userId, 
        status: 'declined',
        createdAt: { $lt: thirtyDaysAgo }
      })
    ]);

    // Calculate changes
    const totalTransactions = currentStats[0];
    const totalSpent = currentStats[1][0]?.total || 0;
    const totalCards = currentStats[2];
    const approvedTransactions = currentStats[3];
    const declinedTransactions = currentStats[4];

    const prevTotalTransactions = previousStats[0];
    const prevTotalSpent = previousStats[1][0]?.total || 0;
    const prevTotalCards = previousStats[2];
    const prevApprovedTransactions = previousStats[3];
    const prevDeclinedTransactions = previousStats[4];

    // Calculate success rate
    const totalProcessed = approvedTransactions + declinedTransactions;
    const successRate = totalProcessed > 0 ? (approvedTransactions / totalProcessed) * 100 : 0;
    const prevTotalProcessed = prevApprovedTransactions + prevDeclinedTransactions;
    const prevSuccessRate = prevTotalProcessed > 0 ? (prevApprovedTransactions / prevTotalProcessed) * 100 : 0;

    // Get top merchants
    const topMerchants = await Transaction.aggregate([
      { $match: { user_id: userId, status: 'approved' } },
      { $group: { _id: '$merchant_name', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { name: '$_id', count: 1, _id: 0 } }
    ]);

    // Get spending by category
    const spendingByCategory = await Transaction.aggregate([
      { $match: { user_id: userId, status: 'approved' } },
      { $group: { _id: '$merchant_category', amount: { $sum: '$amount' } } },
      { $sort: { amount: -1 } },
      { $limit: 5 },
      { $project: { name: '$_id', amount: 1, _id: 0 } }
    ]);

    // Get recent activity
    const recentActivity = await Transaction.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('status merchant_name amount createdAt')
      .lean();

    const activityLog = recentActivity.map(transaction => ({
      type: transaction.status === 'approved' ? 'success' : 
            transaction.status === 'pending' ? 'warning' : 'error',
      message: `${transaction.status === 'approved' ? 'Payment approved' : 
                transaction.status === 'pending' ? 'Payment pending' : 'Payment declined'} for ${transaction.merchant_name || 'Unknown Merchant'}`,
      timestamp: transaction.createdAt
    }));

    const overview = {
      totalCards,
      totalSpent,
      totalTransactions,
      successRate: Math.round(successRate * 10) / 10,
      cardsChange: prevTotalCards > 0 ? Math.round(((totalCards - prevTotalCards) / prevTotalCards) * 100) : 0,
      spendingChange: prevTotalSpent > 0 ? Math.round(((totalSpent - prevTotalSpent) / prevTotalSpent) * 100) : 0,
      transactionsChange: prevTotalTransactions > 0 ? Math.round(((totalTransactions - prevTotalTransactions) / prevTotalTransactions) * 100) : 0,
      successRateChange: Math.round((successRate - prevSuccessRate) * 10) / 10,
      topMerchants,
      spendingByCategory,
      recentActivity: activityLog
    };

    res.json({
      success: true,
      data: overview
    });

  } catch (error) {
    logger.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load dashboard overview'
    });
  }
});

// @route   GET /api/dashboard/transactions
// @desc    Get transaction analytics data
// @access  Private
router.get('/transactions', async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '30' } = req.query;
    
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get daily transaction data
    const dailyTransactions = await Transaction.aggregate([
      {
        $match: {
          user_id: userId,
          createdAt: { $gte: startDate },
          status: 'approved'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          date: '$_id',
          amount: 1,
          count: 1,
          _id: 0
        }
      }
    ]);

    // Fill in missing dates with zero values
    const filledData = [];
    const currentDate = new Date(startDate);
    const endDate = new Date();

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const existingData = dailyTransactions.find(item => item.date === dateStr);
      
      filledData.push({
        date: dateStr,
        amount: existingData ? existingData.amount : 0,
        count: existingData ? existingData.count : 0
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      success: true,
      data: {
        dailyTransactions: filledData,
        totalAmount: dailyTransactions.reduce((sum, item) => sum + item.amount, 0),
        totalCount: dailyTransactions.reduce((sum, item) => sum + item.count, 0)
      }
    });

  } catch (error) {
    logger.error('Dashboard transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load transaction analytics'
    });
  }
});

module.exports = router; 