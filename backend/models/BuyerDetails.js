const mongoose = require('mongoose');

// Define the schema for the buyer details
const buyerDetailsSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer', // Reference the Customer model
    required: true,
    unique: true,
  },
  // Contact Information
  phoneNumber: {
    type: String,
    required: true,
  },
  alternativePhoneNumber: {
    type: String,
    required: false,
  },
  // Address Information
  address: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  pinCode: {
    type: String,
    required: false,
  },
  // Business Information
  companyName: {
    type: String,
    required: false,
  },
  businessType: {
    type: String,
    required: false,
  },
  gstNumber: {
    type: String,
    required: false,
  },
  // Purchase Preferences
  interestedCategories: [{
    type: String,
    required: false,
  }],
  minBudget: {
    type: Number,
    required: false,
  },
  maxBudget: {
    type: Number,
    required: false,
  },
  purchaseFrequency: {
    type: String,
    required: false,
  },
  // Legacy fields for backward compatibility
  location: {
    type: String,
    required: false, // Made optional for backward compatibility
  },
  phone: {
    type: String,
    required: false, // Made optional for backward compatibility
  },
  detailsFilled: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
});

// Create and export the model
module.exports = mongoose.model('BuyerDetails', buyerDetailsSchema);
