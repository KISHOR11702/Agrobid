const mongoose = require('mongoose');

/**
 * Product Schema with Concurrency Control
 * 
 * Features:
 * - Optimistic concurrency control via __v (version key)
 * - Indexed on (status, bidEndDate) for efficient expired product queries
 * - Indexed on (farmerId, status) for farmer dashboard queries
 */

// Define the schema for products
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  category: {
    type: String, // E.g., 'coconuts', 'rice', 'wheat', etc.
    required: true,
  },
  unit: {
    type: String, // Store the unit type (kg or number)
    required: true,
  },
  video: {
    type: String, // Store the path to the video file
    required: true,
  },
  cloudinaryPublicId: {
    type: String,
    required: false,
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FarmerDetails',
    required: true, // Reference to the farmer adding the product
  },
  bidEndDate: {
    type: Date,
    required: true, // Specific end date for bidding
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'sold'],
    default: 'active',
  },
  highestBid: {
    amount: { type: Number, default: 0 },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    buyerName: { type: String, default: '' }
  },
  totalBids: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set the creation date
  },
}, { optimisticConcurrency: true });

// Index for faster queries on active products
productSchema.index({ status: 1, bidEndDate: 1 });
productSchema.index({ farmerId: 1, status: 1 });

// Method to check if the product bidding has expired
productSchema.methods.isExpired = function() {
  return new Date() > this.bidEndDate;
};

// Method to update product status based on bidding end date
productSchema.methods.updateStatus = function() {
  if (this.isExpired() && this.status === 'active') {
    this.status = 'expired';
  }
  return this.status;
};

// Create and export the model
module.exports = mongoose.model('Product', productSchema);
