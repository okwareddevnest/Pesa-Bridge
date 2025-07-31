const axios = require('axios');
const crypto = require('crypto');

// Configuration
const BASE_URL = 'http://localhost:3000/api';
let authToken = null;

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'password123'
};

const testCardData = {
  card_number: '4111111111111111', // This will be replaced with actual generated card
  cvv: '123',
  expiry_month: 12,
  expiry_year: 2026,
  amount: 1000,
  currency: 'KES',
  merchant_name: 'Test Merchant',
  merchant_id: 'TEST001',
  merchant_category: 'Online Shopping'
};

// Utility functions
function generateTestCardNumber() {
  // Generate a valid Visa card number using Luhn algorithm
  let cardNumber = '4'; // Visa starts with 4
  
  // Generate 15 random digits
  for (let i = 0; i < 15; i++) {
    cardNumber += Math.floor(Math.random() * 10);
  }
  
  // Calculate and append check digit using Luhn algorithm
  const checkDigit = calculateLuhnCheckDigit(cardNumber);
  return cardNumber + checkDigit;
}

function calculateLuhnCheckDigit(number) {
  let sum = 0;
  let isEven = false;
  
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number.charAt(i));
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return (10 - (sum % 10)) % 10;
}

// Test functions
async function testHealthCheck() {
  console.log('🔍 Testing health check...');
  try {
    const response = await axios.get(`${BASE_URL.replace('/api', '')}/health`);
    console.log('✅ Health check passed:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return false;
  }
}

async function testUserRegistration() {
  console.log('\n🔍 Testing user registration...');
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, {
      username: 'testuser_' + Date.now(),
      email: 'test_' + Date.now() + '@example.com',
      password: 'password123',
      mpesa_phone: '254700000000'
    });
    
    authToken = response.data.data.token;
    console.log('✅ User registration successful');
    return true;
  } catch (error) {
    console.log('❌ User registration failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testUserLogin() {
  console.log('\n🔍 Testing user login...');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, testUser);
    authToken = response.data.data.token;
    console.log('✅ User login successful');
    return true;
  } catch (error) {
    console.log('❌ User login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testCardGeneration() {
  console.log('\n🔍 Testing card generation...');
  try {
    const response = await axios.post(`${BASE_URL}/cards`, {
      cardholder_name: 'Test User',
      daily_limit: 70000,
      monthly_limit: 1000000,
      is_default: true
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const card = response.data.data;
    testCardData.card_number = card.card_number;
    testCardData.cvv = card.cvv;
    testCardData.expiry_month = card.expiry_month;
    testCardData.expiry_year = card.expiry_year;
    
    console.log('✅ Card generation successful');
    console.log('   Card Number:', card.card_number);
    console.log('   CVV:', card.cvv);
    console.log('   Expiry:', `${card.expiry_month}/${card.expiry_year}`);
    return true;
  } catch (error) {
    console.log('❌ Card generation failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testTransactionAuthorization() {
  console.log('\n🔍 Testing transaction authorization...');
  try {
    const response = await axios.post(`${BASE_URL}/transactions/authorize`, testCardData);
    
    if (response.data.pending) {
      console.log('✅ Transaction authorization initiated (pending STK push)');
      console.log('   Transaction Reference:', response.data.transaction_reference);
      console.log('   Checkout Request ID:', response.data.checkout_request_id);
      return response.data.transaction_reference;
    } else {
      console.log('✅ Transaction authorization completed');
      return response.data.transaction_reference;
    }
  } catch (error) {
    console.log('❌ Transaction authorization failed:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testTransactionStatus(transactionReference) {
  if (!transactionReference) return;
  
  console.log('\n🔍 Testing transaction status check...');
  try {
    const response = await axios.get(`${BASE_URL}/transactions/status/${transactionReference}`);
    console.log('✅ Transaction status check successful');
    console.log('   Status:', response.data.data.status);
    return true;
  } catch (error) {
    console.log('❌ Transaction status check failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testGetUserCards() {
  console.log('\n🔍 Testing get user cards...');
  try {
    const response = await axios.get(`${BASE_URL}/cards`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Get user cards successful');
    console.log('   Cards count:', response.data.data.count);
    return true;
  } catch (error) {
    console.log('❌ Get user cards failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testDashboardOverview() {
  console.log('\n🔍 Testing dashboard overview...');
  try {
    const response = await axios.get(`${BASE_URL}/dashboard/overview`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Dashboard overview successful');
    console.log('   Cards:', response.data.data.cards);
    console.log('   Transactions:', response.data.data.transactions);
    return true;
  } catch (error) {
    console.log('❌ Dashboard overview failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testMpesaStatus() {
  console.log('\n🔍 Testing M-Pesa service status...');
  try {
    const response = await axios.get(`${BASE_URL}/mpesa/status`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ M-Pesa status check successful');
    console.log('   Environment:', response.data.data.environment);
    console.log('   Status:', response.data.data.status);
    return true;
  } catch (error) {
    console.log('❌ M-Pesa status check failed:', error.response?.data?.message || error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting PesaCard M-Pesa Bridge System Tests\n');
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'User Login', fn: testUserLogin },
    { name: 'Card Generation', fn: testCardGeneration },
    { name: 'Transaction Authorization', fn: testTransactionAuthorization },
    { name: 'Get User Cards', fn: testGetUserCards },
    { name: 'Dashboard Overview', fn: testDashboardOverview },
    { name: 'M-Pesa Status', fn: testMpesaStatus }
  ];
  
  let passedTests = 0;
  let transactionReference = null;
  
  for (const test of tests) {
    console.log(`\n📋 Running: ${test.name}`);
    const result = await test.fn();
    
    if (result === true) {
      passedTests++;
    } else if (typeof result === 'string') {
      // Special case for transaction authorization that returns reference
      transactionReference = result;
      passedTests++;
    }
  }
  
  // Test transaction status if we have a reference
  if (transactionReference) {
    console.log(`\n📋 Running: Transaction Status Check`);
    const statusResult = await testTransactionStatus(transactionReference);
    if (statusResult) {
      passedTests++;
    }
  }
  
  console.log(`\n📊 Test Results: ${passedTests}/${tests.length + (transactionReference ? 1 : 0)} tests passed`);
  
  if (passedTests === tests.length + (transactionReference ? 1 : 0)) {
    console.log('🎉 All tests passed! The system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the logs above.');
  }
  
  console.log('\n💡 Note: Transaction authorization will be pending until M-Pesa STK push is approved.');
  console.log('   This is expected behavior for the bridge system.');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests }; 