#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔗 Tailscale Funnel Setup for PesaCard');
console.log('=====================================\n');

// Check if tailscale is installed
function checkTailscale() {
  try {
    execSync('tailscale version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Get current Tailscale status
function getTailscaleStatus() {
  try {
    const status = execSync('tailscale status', { encoding: 'utf8' });
    return status;
  } catch (error) {
    return null;
  }
}

// Check if Tailscale Funnel is enabled
function checkFunnelStatus() {
  try {
    const funnelStatus = execSync('tailscale funnel status', { encoding: 'utf8' });
    return funnelStatus;
  } catch (error) {
    return null;
  }
}

// Update environment file with Tailscale URL
function updateEnvFile(tailscaleUrl) {
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Update or add Tailscale URL
  const tailscaleUrlLine = `TAILSCALE_FUNNEL_URL=${tailscaleUrl}`;
  const mpesaCallbackLine = `MPESA_CALLBACK_URL=${tailscaleUrl}/api/webhooks/mpesa`;

  if (envContent.includes('TAILSCALE_FUNNEL_URL=')) {
    envContent = envContent.replace(/TAILSCALE_FUNNEL_URL=.*/g, tailscaleUrlLine);
  } else {
    envContent += `\n# Tailscale Funnel Configuration (replaces ngrok)\n${tailscaleUrlLine}\n`;
  }

  if (envContent.includes('MPESA_CALLBACK_URL=')) {
    envContent = envContent.replace(/MPESA_CALLBACK_URL=.*/g, mpesaCallbackLine);
  } else {
    envContent += `${mpesaCallbackLine}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Updated .env file with Tailscale URL');
}

// Test webhook endpoint
async function testWebhook(tailscaleUrl) {
  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch(`${tailscaleUrl}/api/webhooks/health`);
    
    if (response.ok) {
      console.log('✅ Webhook endpoint is accessible');
      return true;
    } else {
      console.log('⚠️  Webhook endpoint returned status:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Webhook endpoint is not accessible:', error.message);
    return false;
  }
}

// Main setup function
async function setupTailscale() {
  console.log('1. Checking Tailscale installation...');
  
  if (!checkTailscale()) {
    console.log('❌ Tailscale is not installed');
    console.log('Please install Tailscale first:');
    console.log('  - Visit: https://tailscale.com/download');
    console.log('  - Follow installation instructions for your platform');
    console.log('  - Run: tailscale up');
    return;
  }

  console.log('✅ Tailscale is installed');

  console.log('\n2. Checking Tailscale status...');
  const status = getTailscaleStatus();
  if (status) {
    console.log('✅ Tailscale is running');
    console.log(status);
  } else {
    console.log('❌ Tailscale is not running');
    console.log('Please run: tailscale up');
    return;
  }

  console.log('\n3. Checking Tailscale Funnel status...');
  const funnelStatus = checkFunnelStatus();
  if (funnelStatus) {
    console.log('✅ Tailscale Funnel is enabled');
    console.log(funnelStatus);
    
    // Extract URL from funnel status
    const urlMatch = funnelStatus.match(/https:\/\/[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+\.ts\.net/);
    if (urlMatch) {
      const tailscaleUrl = urlMatch[0];
      console.log(`\n4. Found Tailscale Funnel URL: ${tailscaleUrl}`);
      
      updateEnvFile(tailscaleUrl);
      
      console.log('\n5. Testing webhook endpoint...');
      await testWebhook(tailscaleUrl);
      
      console.log('\n🎉 Tailscale Funnel setup complete!');
      console.log(`\n📡 Webhook URLs:`);
      console.log(`   Health Check: ${tailscaleUrl}/api/webhooks/health`);
      console.log(`   M-Pesa Webhook: ${tailscaleUrl}/api/webhooks/mpesa`);
      console.log(`   STK Callback: ${tailscaleUrl}/api/webhooks/mpesa/stk-callback`);
      
    } else {
      console.log('❌ Could not extract Tailscale Funnel URL from status');
    }
  } else {
    console.log('❌ Tailscale Funnel is not enabled');
    console.log('To enable Tailscale Funnel:');
    console.log('  1. Run: tailscale funnel 3000');
    console.log('  2. Follow the prompts to enable funnel');
    console.log('  3. Run this script again');
  }
}

// Run setup
setupTailscale().catch(console.error); 