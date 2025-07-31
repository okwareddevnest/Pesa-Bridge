const User = require('../models/User');
const VirtualCard = require('../models/VirtualCard');
const logger = require('../utils/logger');

async function seed() {
  try {
    logger.info('Starting database seeding...');

    // Create a test user
    const testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      mpesa_phone: '254700000000',
      daily_transaction_limit: 70000.00,
      single_transaction_limit: 70000.00
    });

    logger.info('Test user created:', testUser.id);

    // Create a test virtual card
    const testCard = await VirtualCard.create({
      user_id: testUser.id,
      card_number: VirtualCard.generateCardNumber(),
      cvv: VirtualCard.generateCvv(),
      expiry_month: 12,
      expiry_year: 2026,
      cardholder_name: 'Test User',
      status: 'active',
      is_default: true,
      daily_limit: 70000.00,
      monthly_limit: 1000000.00
    });

    logger.info('Test card created:', testCard.id);

    // Create another test user
    const testUser2 = await User.create({
      username: 'demo_user',
      email: 'demo@example.com',
      password: 'demo123',
      mpesa_phone: '254711111111',
      daily_transaction_limit: 50000.00,
      single_transaction_limit: 50000.00
    });

    logger.info('Demo user created:', testUser2.id);

    // Create a test card for demo user
    const demoCard = await VirtualCard.create({
      user_id: testUser2.id,
      card_number: VirtualCard.generateCardNumber(),
      cvv: VirtualCard.generateCvv(),
      expiry_month: 6,
      expiry_year: 2025,
      cardholder_name: 'Demo User',
      status: 'active',
      is_default: true,
      daily_limit: 50000.00,
      monthly_limit: 500000.00
    });

    logger.info('Demo card created:', demoCard.id);

    logger.info('Database seeding completed successfully');

    // Log the test credentials
    console.log('\n=== Test Credentials ===');
    console.log('Test User 1:');
    console.log('  Email: test@example.com');
    console.log('  Password: password123');
    console.log('  Card Number:', testCard.getDecryptedCardNumber());
    console.log('  CVV:', testCard.getDecryptedCvv());
    console.log('  Expiry:', `${testCard.expiry_month}/${testCard.expiry_year}`);
    
    console.log('\nTest User 2:');
    console.log('  Email: demo@example.com');
    console.log('  Password: demo123');
    console.log('  Card Number:', demoCard.getDecryptedCardNumber());
    console.log('  CVV:', demoCard.getDecryptedCvv());
    console.log('  Expiry:', `${demoCard.expiry_month}/${demoCard.expiry_year}`);
    console.log('\n========================\n');

  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seed()
    .then(() => {
      logger.info('Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seed }; 