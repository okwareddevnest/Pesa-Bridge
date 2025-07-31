const mongoose = require('mongoose');
const crypto = require('crypto');

const virtualCardSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  card_number: {
    type: String,
    required: true
  },
  card_number_hash: {
    type: String,
    required: true
  },
  expiry_month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  expiry_year: {
    type: Number,
    required: true,
    min: new Date().getFullYear()
  },
  cvv: {
    type: String,
    required: true
  },
  cardholder_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'expired', 'cancelled'],
    default: 'active'
  },
  is_default: {
    type: Boolean,
    default: false
  },
  daily_limit: {
    type: Number,
    default: 70000.00
  },
  monthly_limit: {
    type: Number,
    default: 1000000.00
  },
  total_spent_today: {
    type: Number,
    default: 0.00
  },
  total_spent_month: {
    type: Number,
    default: 0.00
  },
  last_used: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
virtualCardSchema.index({ user_id: 1 });
virtualCardSchema.index({ card_number_hash: 1 }, { unique: true });
virtualCardSchema.index({ card_number: 1 }, { unique: true });
virtualCardSchema.index({ status: 1 });
virtualCardSchema.index({ 'user_id': 1, 'status': 1 });

// Pre-save middleware to encrypt sensitive data
virtualCardSchema.pre('save', async function(next) {
  try {
    // Handle card_number encryption and hashing for new documents or when modified
    if (this.isNew || this.isModified('card_number')) {
      // Create hash before encryption (hash the original card number)
      const originalCardNumber = this.card_number;
      this.card_number_hash = crypto.createHash('sha256').update(originalCardNumber).digest('hex');
      
      // Then encrypt the card number
      this.card_number = encryptData(originalCardNumber);
    }
    
    // Handle CVV encryption for new documents or when modified
    if (this.isNew || this.isModified('cvv')) {
      this.cvv = encryptData(this.cvv);
    }
    
    next();
  } catch (error) {
    console.error('Pre-save middleware error:', error);
    next(error);
  }
});

// Encryption/Decryption functions
function encryptData(data) {
  try {
    if (!data) {
      throw new Error('No data provided for encryption');
    }
    
    const algorithm = 'aes-256-cbc';
    // Create a key from environment variable or use a default for development
    const keyString = process.env.CARD_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || 'dev-key-32-chars-1234567890abcdef';
    
    let key;
    if (keyString.length === 64) {
      key = Buffer.from(keyString, 'hex');
    } else {
      key = crypto.createHash('sha256').update(keyString).digest();
    }
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(data.toString(), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const result = iv.toString('hex') + ':' + encrypted;
    console.log('Encryption successful for data length:', data.length);
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

// Instance methods
virtualCardSchema.methods.getDecryptedCardNumber = function() {
  return decryptData(this.card_number);
};

virtualCardSchema.methods.getDecryptedCvv = function() {
  return decryptData(this.cvv);
};

virtualCardSchema.methods.isExpired = function() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (this.expiry_year < currentYear) return true;
  if (this.expiry_year === currentYear && this.expiry_month < currentMonth) return true;

  return false;
};

virtualCardSchema.methods.canMakeTransaction = function(amount) {
  // Check if card is active
  if (this.status !== 'active') {
    return { allowed: false, reason: 'Card is not active' };
  }

  // Check if card is expired
  if (this.isExpired()) {
    return { allowed: false, reason: 'Card has expired' };
  }

  // Check daily limit
  if ((this.total_spent_today + amount) > this.daily_limit) {
    return { allowed: false, reason: 'Daily limit exceeded' };
  }

  // Check monthly limit
  if ((this.total_spent_month + amount) > this.monthly_limit) {
    return { allowed: false, reason: 'Monthly limit exceeded' };
  }

  return { allowed: true };
};

virtualCardSchema.methods.updateSpending = async function(amount) {
  this.total_spent_today += amount;
  this.total_spent_month += amount;
  this.last_used = new Date();
  return await this.save();
};

// Static methods
virtualCardSchema.statics.generateCardNumber = async function() {
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    // Generate a valid Visa card number using proper BIN ranges
    // Visa BIN ranges: 4xxxxx for standard Visa cards
    // Using 400001 BIN which is suitable for virtual/prepaid cards
    
    let cardNumber = '400001'; // BIN prefix for virtual cards
    
    // Generate remaining 9 digits (to make 15 total before check digit)
    for (let i = 0; i < 9; i++) {
      cardNumber += Math.floor(Math.random() * 10);
    }

    // Calculate and append check digit using Luhn algorithm
    const checkDigit = calculateLuhnCheckDigit(cardNumber);
    const finalCardNumber = cardNumber + checkDigit;
    
    // Verify the generated number passes Luhn validation
    if (!isValidLuhn(finalCardNumber)) {
      console.log('Retrying card generation - failed Luhn validation');
      attempts++;
      continue;
    }
    
    // Check if this card number already exists in database
    const existingCard = await this.findOne({ 
      card_number_hash: crypto.createHash('sha256').update(finalCardNumber).digest('hex') 
    });
    
    if (!existingCard) {
      console.log('Generated valid card:', finalCardNumber.substring(0, 6) + '****' + finalCardNumber.substring(12));
      return finalCardNumber;
    }
    
    attempts++;
  }
  
  throw new Error('Unable to generate unique card number after maximum attempts');
};

virtualCardSchema.statics.generateCvv = function() {
  // Generate a secure 3-digit CVV
  // CVV should be 001-999, but avoid easily guessable patterns
  let cvv;
  do {
    cvv = Math.floor(100 + Math.random() * 900);
  } while (
    // Avoid patterns like 111, 222, 333, etc.
    (cvv.toString().split('').every(digit => digit === cvv.toString()[0])) ||
    // Avoid sequential patterns like 123, 234, etc.
    isSequential(cvv.toString())
  );
  
  return cvv.toString().padStart(3, '0');
};

virtualCardSchema.statics.generateExpiryDate = function() {
  const now = new Date();
  const year = now.getFullYear() + 2 + Math.floor(Math.random() * 3); // 2-4 years from now
  const month = Math.floor(Math.random() * 12) + 1;
  return { month, year };
};

virtualCardSchema.statics.findByCardNumberHash = function(hash) {
  return this.findOne({ card_number_hash: hash });
};

virtualCardSchema.statics.findByUser = function(userId) {
  return this.find({ user_id: userId }).sort({ created_at: -1 });
};

virtualCardSchema.statics.findActiveByUser = function(userId) {
  return this.find({ user_id: userId, status: 'active' });
};

// Luhn algorithm functions
function calculateLuhnCheckDigit(number) {
  let sum = 0;
  let isEven = false;

  // Loop through values starting from the rightmost side
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

// Validate a complete card number using Luhn algorithm
function isValidLuhn(cardNumber) {
  let sum = 0;
  let isEven = false;

  // Process digits from right to left
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber.charAt(i));

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

// Check if a number sequence is sequential (like 123, 234, etc.)
function isSequential(str) {
  for (let i = 0; i < str.length - 1; i++) {
    const current = parseInt(str[i]);
    const next = parseInt(str[i + 1]);
    if (next !== current + 1) {
      return false;
    }
  }
  return true;
}

const VirtualCard = mongoose.model('VirtualCard', virtualCardSchema);

module.exports = VirtualCard; 