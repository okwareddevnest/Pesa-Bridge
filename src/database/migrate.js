const sequelize = require('./connection');
const User = require('../models/User');
const VirtualCard = require('../models/VirtualCard');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

// Define associations
User.hasMany(VirtualCard, { foreignKey: 'user_id', as: 'cards' });
VirtualCard.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

VirtualCard.hasMany(Transaction, { foreignKey: 'card_id', as: 'transactions' });
Transaction.belongsTo(VirtualCard, { foreignKey: 'card_id', as: 'card' });

User.hasMany(Transaction, { foreignKey: 'user_id', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

async function migrate() {
  try {
    logger.info('Starting database migration...');

    // Sync all models with database
    await sequelize.sync({ force: false, alter: true });

    logger.info('Database migration completed successfully');

    // Create indexes for better performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_virtual_cards_user_id ON virtual_cards(user_id);
      CREATE INDEX IF NOT EXISTS idx_virtual_cards_status ON virtual_cards(status);
      CREATE INDEX IF NOT EXISTS idx_virtual_cards_card_number_hash ON virtual_cards(card_number_hash);
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_card_id ON transactions(card_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
      CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
      CREATE INDEX IF NOT EXISTS idx_transactions_mpesa_checkout_request_id ON transactions(mpesa_checkout_request_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_transaction_reference ON transactions(transaction_reference);
    `);

    logger.info('Database indexes created successfully');

  } catch (error) {
    logger.error('Database migration failed:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrate()
    .then(() => {
      logger.info('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrate }; 