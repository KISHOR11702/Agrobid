const mongoose = require('mongoose');

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
  amount: { type: Number, required: true },
  isWinningBid: { type: Boolean, default: false },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  status: { type: String, enum: ['Pending', 'Won', 'Lost'], default: 'Pending' },
});

module.exports = mongoose.model('Bid', bidSchema);
