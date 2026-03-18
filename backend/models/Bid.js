const mongoose = require('mongoose');

/**
 * Bid Schema with Concurrency Control
 * 
 * Features:
 * - Optimistic concurrency control via __v (version key)
 * - Compound unique index on (buyerId, productId) prevents duplicate bids
 * - Indexed on (productId, amount) for efficient sorting and queries
 */

const bidSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  buyerName: {
    type: String,
    required: true,
  },
  amount: { type: Number, required: true },
  isWinningBid: { type: Boolean, default: false },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  status: { type: String, enum: ['Pending', 'Won', 'Lost'], default: 'Pending' },
  notified: { type: Boolean, default: false },
}, { optimisticConcurrency: true });

// Compound index to ensure one bid per buyer per product
bidSchema.index({ buyerId: 1, productId: 1 }, { unique: true });

// Index for faster queries
bidSchema.index({ productId: 1, amount: -1 });

module.exports = mongoose.model('Bid', bidSchema);
