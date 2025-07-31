const VirtualCard = require('../models/VirtualCard');
const User = require('../models/User');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

class CardService {
  async generateCard(userId, cardholderName, options = {}) {
    try {
      // Check user exists and is active
      const user = await User.findByPk(userId);
      if (!user || !user.is_active) {
        throw new Error('User not found or inactive');
      }

      // Check card limit
      const existingCards = await VirtualCard.count({
        where: { user_id: userId, status: 'active' }
      });

      const maxCards = parseInt(process.env.MAX_CARDS_PER_USER) || 10;
      if (existingCards >= maxCards) {
        throw new Error(`Maximum number of cards (${maxCards}) reached`);
      }

      // Generate card details
      const cardNumber = VirtualCard.generateCardNumber();
      const cvv = VirtualCard.generateCvv();
      const { month, year } = VirtualCard.generateExpiryDate();

      // Create card record
      const card = await VirtualCard.create({
        user_id: userId,
        card_number: cardNumber,
        cvv: cvv,
        expiry_month: month,
        expiry_year: year,
        cardholder_name: cardholderName,
        daily_limit: options.daily_limit || 70000.00,
        monthly_limit: options.monthly_limit || 1000000.00,
        is_default: options.is_default || false
      });

      // If this is set as default, unset other default cards
      if (options.is_default) {
        await VirtualCard.update(
          { is_default: false },
          { 
            where: { 
              user_id: userId, 
              id: { [VirtualCard.sequelize.Op.ne]: card.id } 
            } 
          }
        );
      }

      // Cache card for quick lookup
      cache.set(`card:${card.id}`, JSON.stringify({
        id: card.id,
        user_id: card.user_id,
        status: card.status,
        is_default: card.is_default
      }), 3600);

      logger.info('Virtual card generated successfully', {
        cardId: card.id,
        userId: userId,
        cardholderName: cardholder_name
      });

      return {
        success: true,
        card: {
          id: card.id,
          card_number: card.getDecryptedCardNumber(),
          cvv: card.getDecryptedCvv(),
          expiry_month: card.expiry_month,
          expiry_year: card.expiry_year,
          cardholder_name: card.cardholder_name,
          status: card.status,
          is_default: card.is_default,
          daily_limit: card.daily_limit,
          monthly_limit: card.monthly_limit,
          created_at: card.created_at
        }
      };

    } catch (error) {
      logger.error('Failed to generate card:', error);
      throw error;
    }
  }

  async getCard(cardId, userId) {
    try {
      const card = await VirtualCard.findOne({
        where: { id: cardId, user_id: userId }
      });

      if (!card) {
        throw new Error('Card not found');
      }

      return {
        success: true,
        card: {
          id: card.id,
          card_number: card.getDecryptedCardNumber(),
          cvv: card.getDecryptedCvv(),
          expiry_month: card.expiry_month,
          expiry_year: card.expiry_year,
          cardholder_name: card.cardholder_name,
          status: card.status,
          is_default: card.is_default,
          daily_limit: card.daily_limit,
          monthly_limit: card.monthly_limit,
          total_spent_today: card.total_spent_today,
          total_spent_month: card.total_spent_month,
          last_used: card.last_used,
          created_at: card.created_at
        }
      };

    } catch (error) {
      logger.error('Failed to get card:', error);
      throw error;
    }
  }

  async getUserCards(userId) {
    try {
      const cards = await VirtualCard.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']]
      });

      return {
        success: true,
        cards: cards.map(card => ({
          id: card.id,
          card_number: this.maskCardNumber(card.getDecryptedCardNumber()),
          expiry_month: card.expiry_month,
          expiry_year: card.expiry_year,
          cardholder_name: card.cardholder_name,
          status: card.status,
          is_default: card.is_default,
          daily_limit: card.daily_limit,
          monthly_limit: card.monthly_limit,
          total_spent_today: card.total_spent_today,
          total_spent_month: card.total_spent_month,
          last_used: card.last_used,
          created_at: card.created_at
        }))
      };

    } catch (error) {
      logger.error('Failed to get user cards:', error);
      throw error;
    }
  }

  async updateCard(cardId, userId, updates) {
    try {
      const card = await VirtualCard.findOne({
        where: { id: cardId, user_id: userId }
      });

      if (!card) {
        throw new Error('Card not found');
      }

      // Update allowed fields
      const allowedUpdates = ['cardholder_name', 'daily_limit', 'monthly_limit', 'is_default'];
      const updateData = {};

      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          updateData[field] = updates[field];
        }
      });

      await card.update(updateData);

      // If setting as default, unset other default cards
      if (updates.is_default) {
        await VirtualCard.update(
          { is_default: false },
          { 
            where: { 
              user_id: userId, 
              id: { [VirtualCard.sequelize.Op.ne]: cardId } 
            } 
          }
        );
      }

      // Update cache
      cache.set(`card:${card.id}`, JSON.stringify({
        id: card.id,
        user_id: card.user_id,
        status: card.status,
        is_default: card.is_default
      }), 3600);

      logger.info('Card updated successfully', { cardId, userId });

      return { success: true, card };

    } catch (error) {
      logger.error('Failed to update card:', error);
      throw error;
    }
  }

  async suspendCard(cardId, userId) {
    try {
      const card = await VirtualCard.findOne({
        where: { id: cardId, user_id: userId }
      });

      if (!card) {
        throw new Error('Card not found');
      }

      await card.update({ status: 'suspended' });

      // Remove from cache
      await redis.del(`card:${cardId}`);

      logger.info('Card suspended successfully', { cardId, userId });

      return { success: true };

    } catch (error) {
      logger.error('Failed to suspend card:', error);
      throw error;
    }
  }

  async cancelCard(cardId, userId) {
    try {
      const card = await VirtualCard.findOne({
        where: { id: cardId, user_id: userId }
      });

      if (!card) {
        throw new Error('Card not found');
      }

      await card.update({ status: 'cancelled' });

      // Remove from cache
      await redis.del(`card:${cardId}`);

      logger.info('Card cancelled successfully', { cardId, userId });

      return { success: true };

    } catch (error) {
      logger.error('Failed to cancel card:', error);
      throw error;
    }
  }

  async validateCard(cardNumber, cvv, expiryMonth, expiryYear) {
    try {
      // Basic validation
      if (!cardNumber || cardNumber.length !== 16) {
        return { valid: false, reason: 'Invalid card number length' };
      }

      if (!cvv || cvv.length !== 3) {
        return { valid: false, reason: 'Invalid CVV' };
      }

      if (!expiryMonth || expiryMonth < 1 || expiryMonth > 12) {
        return { valid: false, reason: 'Invalid expiry month' };
      }

      const currentYear = new Date().getFullYear();
      if (!expiryYear || expiryYear < currentYear) {
        return { valid: false, reason: 'Card expired' };
      }

      // Check if card exists and is active
      const cardHash = require('crypto').createHash('sha256').update(cardNumber).digest('hex');
      const card = await VirtualCard.findOne({
        where: { card_number_hash: cardHash, status: 'active' }
      });

      if (!card) {
        return { valid: false, reason: 'Card not found or inactive' };
      }

      // Verify CVV
      if (card.getDecryptedCvv() !== cvv) {
        return { valid: false, reason: 'Invalid CVV' };
      }

      // Check expiry
      if (card.isExpired()) {
        return { valid: false, reason: 'Card expired' };
      }

      return { 
        valid: true, 
        card: card,
        user_id: card.user_id 
      };

    } catch (error) {
      logger.error('Card validation error:', error);
      return { valid: false, reason: 'Validation error' };
    }
  }

  maskCardNumber(cardNumber) {
    if (!cardNumber || cardNumber.length < 4) return cardNumber;
    return '*'.repeat(cardNumber.length - 4) + cardNumber.slice(-4);
  }

  async checkFraudPatterns(cardId, transactionData) {
    try {
      // Get recent transactions for this card
      const recentTransactions = await require('../models/Transaction').findAll({
        where: { card_id: cardId },
        order: [['created_at', 'DESC']],
        limit: 10
      });

      const fraudIndicators = [];

      // Check for rapid transactions
      if (recentTransactions.length > 0) {
        const lastTransaction = recentTransactions[0];
        const timeDiff = Date.now() - new Date(lastTransaction.created_at).getTime();
        
        if (timeDiff < 30000) { // Less than 30 seconds
          fraudIndicators.push('Rapid transaction detected');
        }
      }

      // Check for unusual amounts
      const avgAmount = recentTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0) / recentTransactions.length;
      if (transactionData.amount > avgAmount * 5) {
        fraudIndicators.push('Unusual transaction amount');
      }

      // Check for multiple failed attempts
      const failedAttempts = recentTransactions.filter(t => 
        ['declined', 'failed'].includes(t.status)
      ).length;

      if (failedAttempts >= 3) {
        fraudIndicators.push('Multiple failed attempts');
      }

      return {
        suspicious: fraudIndicators.length > 0,
        indicators: fraudIndicators
      };

    } catch (error) {
      logger.error('Fraud check error:', error);
      return { suspicious: false, indicators: [] };
    }
  }
}

module.exports = new CardService(); 