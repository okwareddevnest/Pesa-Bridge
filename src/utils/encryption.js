const crypto = require('crypto');

function encryptData(data) {
  try {
    const algorithm = 'aes-256-cbc';
    // Create a key from environment variable or use a default for development
    const keyString = process.env.CARD_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || 'dev-key-32-chars-1234567890abcdef';
    const key = keyString.length === 64 ? Buffer.from(keyString, 'hex') : crypto.createHash('sha256').update(keyString).digest();
    
    // Generate a random IV
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    // Encrypt the data
    let encrypted = cipher.update(data.toString(), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return IV and encrypted data
    const result = iv.toString('hex') + ':' + encrypted;
    return result;
  } catch (error) {
    console.error('Encryption error:', error);
    // For development, return base64 encoded data as fallback
    console.log('Using base64 fallback for encryption');
    return Buffer.from(data.toString()).toString('base64');
  }
}

function decryptData(encryptedData) {
  try {
    const algorithm = 'aes-256-cbc';
    // Create a key from environment variable or use a default for development
    const keyString = process.env.CARD_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || 'dev-key-32-chars-1234567890abcdef';
    const key = keyString.length === 64 ? Buffer.from(keyString, 'hex') : crypto.createHash('sha256').update(keyString).digest();
    
    if (!encryptedData.includes(':')) {
      // Fallback for base64 encoded data (development)
      return Buffer.from(encryptedData, 'base64').toString('utf8');
    }
    
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // For development, try base64 decode
    try {
      return Buffer.from(encryptedData, 'base64').toString('utf8');
    } catch {
      return '****';
    }
  }
}

module.exports = {
  encryptData,
  decryptData
}; 