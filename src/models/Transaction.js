const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  card_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VirtualCard',
    required: true
  },
  transaction_reference: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'KES',
    required: true,
    maxlength: 3
  },
  amount_kes: {
    type: Number,
    required: true
  },
  merchant_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  merchant_id: {
    type: String,
    maxlength: 100
  },
  merchant_category: {
    type: String,
    maxlength: 100
  },
  status: {
    type: String,
    enum: [
      'pending_authorization',
      'stk_push_sent',
      'awaiting_user_response',
      'approved',
      'declined',
      'failed',
      'expired',
      'cancelled'
    ],
    default: 'pending_authorization'
  },
  mpesa_checkout_request_id: {
    type: String
  },
  mpesa_result_code: {
    type: Number
  },
  mpesa_result_desc: {
    type: String,
    maxlength: 255
  },
  mpesa_transaction_id: {
    type: String
  },
  authorization_code: {
    type: String,
    maxlength: 10
  },
  decline_reason: {
    type: String,
    maxlength: 255
  },
  decline_code: {
    type: String,
    maxlength: 10
  },
  stk_push_sent_at: {
    type: Date
  },
  user_response_at: {
    type: Date
  },
  completed_at: {
    type: Date
  },
  timeout_at: {
    type: Date
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
transactionSchema.index({ user_id: 1 });
transactionSchema.index({ card_id: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ created_at: -1 });
transactionSchema.index({ mpesa_checkout_request_id: 1 }, { unique: true, sparse: true });
transactionSchema.index({ transaction_reference: 1 }, { unique: true });
transactionSchema.index({ mpesa_transaction_id: 1 }, { unique: true, sparse: true });
transactionSchema.index({ 'user_id': 1, 'status': 1 });
transactionSchema.index({ 'user_id': 1, 'created_at': -1 });

// Instance methods
transactionSchema.methods.isExpired = function() {
  if (!this.timeout_at) return false;
  return new Date() > this.timeout_at;
};

transactionSchema.methods.setTimeout = function(minutes = 0.5) {
  this.timeout_at = new Date(Date.now() + (minutes * 60 * 1000));
  return this.save();
};

transactionSchema.methods.updateStatus = async function(status, metadata = {}) {
  this.status = status;
  this.metadata = { ...this.metadata, ...metadata };

  switch (status) {
    case 'stk_push_sent':
      this.stk_push_sent_at = new Date();
      break;
    case 'awaiting_user_response':
      this.user_response_at = new Date();
      break;
    case 'approved':
    case 'declined':
    case 'failed':
      this.completed_at = new Date();
      break;
  }

  return await this.save();
};

// Static methods
transactionSchema.statics.findByReference = function(reference) {
  return this.findOne({ transaction_reference: reference });
};

transactionSchema.statics.findByCheckoutRequestId = function(checkoutRequestId) {
  return this.findOne({ mpesa_checkout_request_id: checkoutRequestId });
};

transactionSchema.statics.findByUser = function(userId, options = {}) {
  const query = { user_id: userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.card_id) {
    query.card_id = options.card_id;
  }
  
  if (options.start_date || options.end_date) {
    query.created_at = {};
    if (options.start_date) {
      query.created_at.$gte = new Date(options.start_date);
    }
    if (options.end_date) {
      query.created_at.$lte = new Date(options.end_date);
    }
  }
  
  return this.find(query)
    .populate('card_id', 'cardholder_name card_number_hash')
    .sort({ created_at: -1 })
    .limit(options.limit || 20)
    .skip(options.skip || 0);
};

transactionSchema.statics.findPendingTransactions = function() {
  return this.find({
    status: { $in: ['stk_push_sent', 'awaiting_user_response'] },
    timeout_at: { $lt: new Date() }
  });
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction; 