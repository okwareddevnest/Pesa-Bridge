#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');
const VirtualCard = require('../src/models/VirtualCard');
const Transaction = require('../src/models/Transaction');

console.log('🗄️  PesaCard MongoDB Setup\n');

async function setupMongoDB() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pesacard_bridge';
    
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB successfully');
    
    // Create indexes
    console.log('📊 Creating database indexes...');
    
    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ phoneNumber: 1 });
    await User.collection.createIndex({ createdAt: -1 });
    
    // VirtualCard indexes
    await VirtualCard.collection.createIndex({ userId: 1 });
    await VirtualCard.collection.createIndex({ cardNumber: 1 }, { unique: true });
    await VirtualCard.collection.createIndex({ status: 1 });
    await VirtualCard.collection.createIndex({ createdAt: -1 });
    
    // Transaction indexes
    await Transaction.collection.createIndex({ userId: 1 });
    await Transaction.collection.createIndex({ cardId: 1 });
    await Transaction.collection.createIndex({ mpesaRequestId: 1 }, { unique: true, sparse: true });
    await Transaction.collection.createIndex({ status: 1 });
    await Transaction.collection.createIndex({ createdAt: -1 });
    await Transaction.collection.createIndex({ merchantName: 1 });
    
    console.log('✅ Database indexes created successfully');
    
    // Display database statistics
    console.log('\n📊 Database Statistics:');
    console.log('=======================');
    console.log(`Users: ${await User.countDocuments()}`);
    console.log(`Virtual Cards: ${await VirtualCard.countDocuments()}`);
    console.log(`Transactions: ${await Transaction.countDocuments()}`);
    
    console.log('\n✅ MongoDB setup completed successfully!');
    console.log('\n🔧 Next Steps:');
    console.log('1. Start the server: npm run dev');
    console.log('2. Register a new user account');
    console.log('3. Set up M-Pesa webhooks: npm run setup-webhooks');
    
  } catch (error) {
    console.error('❌ MongoDB setup failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run setup
setupMongoDB(); 