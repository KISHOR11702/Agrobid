const mongoose = require('mongoose');

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
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FarmerDetails',
    required: true, // Reference to the farmer adding the product
  },
  duration: {
    type: Number, // Duration in days
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set the creation date
  },
});

// Method to check if the product has expired
productSchema.methods.isExpired = function() {
  const expiryDate = new Date(this.createdAt);
  expiryDate.setDate(expiryDate.getDate() + this.duration);
  return new Date() > expiryDate; // If current date is greater than expiry date, product is expired
};

// Create and export the model
module.exports = mongoose.model('Product', productSchema);
