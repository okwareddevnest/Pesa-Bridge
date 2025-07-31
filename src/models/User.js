const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
    match: /^[a-zA-Z0-9_]+$/
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  mpesa_phone: {
    type: String,
    required: true,
    match: /^254[0-9]{9}$/
  },
  is_active: {
    type: Boolean,
    default: true
  },
  last_login: {
    type: Date
  },
  daily_transaction_limit: {
    type: Number,
    default: 70000.00
  },
  single_transaction_limit: {
    type: Number,
    default: 70000.00
  },
  total_daily_spent: {
    type: Number,
    default: 0.00
  },
  reset_daily_spent_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ mpesa_phone: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.resetDailySpent = function() {
  this.total_daily_spent = 0.00;
  this.reset_daily_spent_at = new Date();
  return this.save();
};

userSchema.methods.canMakeTransaction = function(amount) {
  const now = new Date();
  const lastReset = new Date(this.reset_daily_spent_at);

  // Reset daily spent if it's a new day
  if (now.getDate() !== lastReset.getDate() ||
      now.getMonth() !== lastReset.getMonth() ||
      now.getFullYear() !== lastReset.getFullYear()) {
    this.resetDailySpent();
  }

  // Check single transaction limit
  if (amount > this.single_transaction_limit) {
    return { allowed: false, reason: 'Single transaction limit exceeded' };
  }

  // Check daily transaction limit
  if ((this.total_daily_spent + amount) > this.daily_transaction_limit) {
    return { allowed: false, reason: 'Daily transaction limit exceeded' };
  }

  return { allowed: true };
};

userSchema.methods.updateDailySpent = async function(amount) {
  this.total_daily_spent += amount;
  return await this.save();
};

// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByUsername = function(username) {
  return this.findOne({ username });
};

userSchema.statics.findByMpesaPhone = function(phone) {
  return this.findOne({ mpesa_phone: phone });
};

const User = mongoose.model('User', userSchema);

module.exports = User; 