#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 PesaCard M-Pesa Webhook Setup\n');

// Check if ngrok is installed
function checkNgrok() {
  try {
    execSync('ngrok version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Install ngrok if not present
async function installNgrok() {
  console.log('📦 Installing ngrok...');
  
  try {
    if (process.platform === 'win32') {
      // Windows
      execSync('choco install ngrok', { stdio: 'inherit' });
    } else if (process.platform === 'darwin') {
      // macOS
      execSync('brew install ngrok', { stdio: 'inherit' });
    } else {
      // Linux
      console.log('Please install ngrok manually:');
      console.log('1. Download from https://ngrok.com/download');
      console.log('2. Extract and add to PATH');
      console.log('3. Run: ngrok authtoken YOUR_TOKEN');
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Failed to install ngrok:', error.message);
    return false;
  }
}

// Start ngrok tunnel
function startNgrok(port) {
  console.log(`🌐 Starting ngrok tunnel on port ${port}...`);
  
  try {
    const ngrokProcess = execSync(`ngrok http ${port} --log=stdout`, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    // Parse ngrok output to get the public URL
    const lines = ngrokProcess.split('\n');
    const urlLine = lines.find(line => line.includes('https://') && line.includes('.ngrok.io'));
    
    if (urlLine) {
      const url = urlLine.match(/https:\/\/[a-zA-Z0-9-]+\.ngrok\.io/)[0];
      return url;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Failed to start ngrok:', error.message);
    return null;
  }
}

// Update environment file with ngrok URL
function updateEnvFile(ngrokUrl) {
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), 'env.example');
  
  let envContent = '';
  
  // Read existing .env file or create from example
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  } else if (fs.existsSync(envExamplePath)) {
    envContent = fs.readFileSync(envExamplePath, 'utf8');
  }
  
  // Update or add ngrok URL
  const ngrokUrlLine = `NGROK_URL=${ngrokUrl}`;
  const webhookUrlLine = `MPESA_WEBHOOK_URL=${ngrokUrl}/api/webhooks/mpesa`;
  
  if (envContent.includes('NGROK_URL=')) {
    envContent = envContent.replace(/NGROK_URL=.*/g, ngrokUrlLine);
  } else {
    envContent += `\n# Development Webhook Configuration (ngrok)\n${ngrokUrlLine}\n`;
  }
  
  if (envContent.includes('MPESA_WEBHOOK_URL=')) {
    envContent = envContent.replace(/MPESA_WEBHOOK_URL=.*/g, webhookUrlLine);
  } else {
    envContent += `${webhookUrlLine}\n`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Updated .env file with ngrok URL');
}

// Test webhook endpoint
async function testWebhook(ngrokUrl) {
  console.log('\n🧪 Testing webhook endpoint...');
  
  try {
    const response = await fetch(`${ngrokUrl}/api/webhooks/health`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Webhook endpoint is working!');
      console.log('📊 Health check response:', data);
    } else {
      console.log('❌ Webhook endpoint returned error:', data);
    }
  } catch (error) {
    console.log('❌ Failed to test webhook endpoint:', error.message);
  }
}

// Main setup function
async function setup() {
  // Check if ngrok is installed
  if (!checkNgrok()) {
    console.log('❌ ngrok is not installed');
    
    const install = await new Promise(resolve => {
      rl.question('Would you like to install ngrok? (y/n): ', resolve);
    });
    
    if (install.toLowerCase() === 'y') {
      const success = await installNgrok();
      if (!success) {
        console.log('Please install ngrok manually and run this script again.');
        rl.close();
        return;
      }
    } else {
      console.log('Please install ngrok manually and run this script again.');
      rl.close();
      return;
    }
  }
  
  // Get port number
  const port = await new Promise(resolve => {
    rl.question('Enter the port your server is running on (default: 3000): ', (answer) => {
      resolve(answer || '3000');
    });
  });
  
  // Start ngrok
  const ngrokUrl = startNgrok(port);
  
  if (!ngrokUrl) {
    console.log('❌ Failed to get ngrok URL');
    rl.close();
    return;
  }
  
  console.log(`✅ ngrok tunnel started: ${ngrokUrl}`);
  
  // Update environment file
  updateEnvFile(ngrokUrl);
  
  // Test webhook
  await testWebhook(ngrokUrl);
  
  // Display M-Pesa configuration
  console.log('\n📋 M-Pesa Webhook Configuration:');
  console.log('================================');
  console.log(`Webhook URL: ${ngrokUrl}/api/webhooks/mpesa`);
  console.log(`Health Check: ${ngrokUrl}/api/webhooks/health`);
  console.log(`Test Endpoint: ${ngrokUrl}/api/webhooks/test`);
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Update your M-Pesa Daraja API configuration with the webhook URL');
  console.log('2. Restart your server to load the new environment variables');
  console.log('3. Test the webhook with a real M-Pesa transaction');
  
  console.log('\n💡 Tips:');
  console.log('- Keep this terminal open to maintain the ngrok tunnel');
  console.log('- The ngrok URL will change each time you restart ngrok');
  console.log('- For production, use a permanent domain instead of ngrok');
  
  rl.close();
}

// Handle script termination
process.on('SIGINT', () => {
  console.log('\n\n👋 Setup interrupted. Goodbye!');
  rl.close();
  process.exit(0);
});

// Run setup
setup().catch(error => {
  console.error('❌ Setup failed:', error);
  rl.close();
  process.exit(1);
}); 