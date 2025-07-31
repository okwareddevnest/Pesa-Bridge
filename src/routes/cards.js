const express = require('express');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const VirtualCard = require('../models/VirtualCard');
const logger = require('../utils/logger');

// Import decryption function
const { decryptData } = require('../utils/encryption');

const router = express.Router();

// @route   GET /api/cards
// @desc    Get user's virtual cards
// @access  Private
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const cards = await VirtualCard.find({ user_id: userId })
      .select('-card_number -cvv') // Don't send sensitive data
      .sort({ createdAt: -1 });

    // Add masked card numbers for display
    const cardsWithMaskedNumbers = cards.map(card => {
      const cardObj = card.toObject();
      // Generate a consistent masked number from the card hash
      const hashSuffix = card.card_number_hash.slice(-4);
      cardObj.masked_card_number = `**** **** **** ${hashSuffix}`;
      return cardObj;
    });

    res.json({
      success: true,
      data: cardsWithMaskedNumbers
    });

  } catch (error) {
    logger.error('Get cards error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cards'
    });
  }
});

// @route   POST /api/cards
// @desc    Create a new virtual card
// @access  Private
router.post('/', [
  body('cardholderName').trim().isLength({ min: 2, max: 50 }).withMessage('Cardholder name must be between 2 and 50 characters'),
  body('dailyLimit').isInt({ min: 1000, max: 100000 }).withMessage('Daily limit must be between 1,000 and 100,000 KES'),
  body('monthlyLimit').isInt({ min: 10000, max: 1000000 }).withMessage('Monthly limit must be between 10,000 and 1,000,000 KES')
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
    const { cardholderName, dailyLimit, monthlyLimit } = req.body;

    // Check if user has reached maximum cards limit
    const existingCards = await VirtualCard.countDocuments({ user_id: userId });
    const maxCards = 10; // Configurable limit
    
    if (existingCards >= maxCards) {
      return res.status(400).json({
        success: false,
        error: `Maximum number of cards (${maxCards}) reached`
      });
    }

    // Generate virtual card details
    logger.info('Starting card generation for user:', userId);
    
    let cardNumber, cvv, expiryDate;
    try {
      cardNumber = await VirtualCard.generateCardNumber();
      logger.info('Card number generated successfully');
    } catch (error) {
      logger.error('Card number generation failed:', error);
      throw error;
    }
    
    try {
      cvv = VirtualCard.generateCvv();
      expiryDate = VirtualCard.generateExpiryDate();
      logger.info('CVV and expiry generated successfully');
    } catch (error) {
      logger.error('CVV/expiry generation failed:', error);
      throw error;
    }

    // Create hash for the card number
    const cardNumberHash = crypto.createHash('sha256').update(cardNumber).digest('hex');

    const card = new VirtualCard({
      user_id: userId,
      card_number: cardNumber,
      card_number_hash: cardNumberHash,
      cardholder_name: cardholderName.toUpperCase(),
      expiry_month: expiryDate.month,
      expiry_year: expiryDate.year,
      cvv,
      status: 'active',
      daily_limit: dailyLimit,
      monthly_limit: monthlyLimit
    });

    logger.info('Card object created, attempting to save...');
    
    await card.save();
    logger.info('Card saved successfully:', card._id);

    // Return card without sensitive data
    const cardResponse = card.toObject();
    delete cardResponse.card_number;
    delete cardResponse.cvv;

    logger.info('Virtual card created', { userId, cardId: card._id });

    res.status(201).json({
      success: true,
      data: cardResponse,
      message: 'Virtual card created successfully'
    });

  } catch (error) {
    logger.error('Create card error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create virtual card'
    });
  }
});

// @route   GET /api/cards/:id
// @desc    Get specific card details
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const cardId = req.params.id;

    const card = await VirtualCard.findOne({ _id: cardId, user_id: userId })
      .select('-card_number -cvv');

    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'Card not found'
      });
    }

    // Add masked card number for display
    const cardResponse = card.toObject();
    const hashSuffix = card.card_number_hash.slice(-4);
    cardResponse.masked_card_number = `**** **** **** ${hashSuffix}`;

    res.json({
      success: true,
      data: cardResponse
    });

  } catch (error) {
    logger.error('Get card error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch card'
    });
  }
});

// @route   GET /api/cards/:id/reveal
// @desc    Temporarily reveal full card details (60 seconds)
// @access  Private
router.get('/:id/reveal', async (req, res) => {
  try {
    const userId = req.user.id;
    const cardId = req.params.id;

    const card = await VirtualCard.findOne({ _id: cardId, user_id: userId });

    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'Card not found'
      });
    }

    // Decrypt the card number and CVV
    const decryptedCardNumber = decryptData(card.card_number);
    const decryptedCvv = decryptData(card.cvv);

    // Create response with full details
    const cardResponse = {
      _id: card._id,
      cardholder_name: card.cardholder_name,
      card_number: decryptedCardNumber,
      cvv: decryptedCvv,
      expiry_month: card.expiry_month,
      expiry_year: card.expiry_year,
      status: card.status,
      daily_limit: card.daily_limit,
      monthly_limit: card.monthly_limit,
      total_spent_today: card.total_spent_today,
      total_spent_month: card.total_spent_month,
      created_at: card.createdAt,
      expires_at: new Date(Date.now() + 60000) // 60 seconds from now
    };

    logger.info('Card details revealed temporarily', { userId, cardId });

    res.json({
      success: true,
      data: cardResponse,
      message: 'Card details revealed. They will expire in 60 seconds.'
    });

  } catch (error) {
    logger.error('Reveal card error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reveal card details'
    });
  }
});

// @route   PUT /api/cards/:id
// @desc    Update card settings
// @access  Private
router.put('/:id', [
  body('cardholderName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Cardholder name must be between 2 and 50 characters'),
  body('dailyLimit').optional().isInt({ min: 1000, max: 100000 }).withMessage('Daily limit must be between 1,000 and 100,000 KES'),
  body('monthlyLimit').optional().isInt({ min: 10000, max: 1000000 }).withMessage('Monthly limit must be between 10,000 and 1,000,000 KES'),
  body('status').optional().isIn(['active', 'suspended', 'cancelled']).withMessage('Invalid status')
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
    const cardId = req.params.id;
    const updates = req.body;

    const card = await VirtualCard.findOne({ _id: cardId, user_id: userId });

    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'Card not found'
      });
    }

    // Update allowed fields
    if (updates.cardholderName) {
      card.cardholder_name = updates.cardholderName.toUpperCase();
    }
    if (updates.dailyLimit) {
      card.daily_limit = updates.dailyLimit;
    }
    if (updates.monthlyLimit) {
      card.monthly_limit = updates.monthlyLimit;
    }
    if (updates.status) {
      card.status = updates.status;
    }

    await card.save();

    // Return updated card without sensitive data
    const cardResponse = card.toObject();
    delete cardResponse.card_number;
    delete cardResponse.cvv;

    logger.info('Card updated', { userId, cardId, updates });

    res.json({
      success: true,
      data: cardResponse,
      message: 'Card updated successfully'
    });

  } catch (error) {
    logger.error('Update card error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update card'
    });
  }
});

// @route   DELETE /api/cards/:id
// @desc    Delete virtual card
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const cardId = req.params.id;

    const card = await VirtualCard.findOne({ _id: cardId, user_id: userId });

    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'Card not found'
      });
    }

    // Check if card has pending transactions
    // This would require a Transaction model check
    // For now, we'll just delete the card

    await VirtualCard.findByIdAndDelete(cardId);

    logger.info('Card deleted', { userId, cardId });

    res.json({
      success: true,
      message: 'Card deleted successfully'
    });

  } catch (error) {
    logger.error('Delete card error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete card'
    });
  }
});


module.exports = router; 