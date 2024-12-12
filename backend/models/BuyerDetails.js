const mongoose = require('mongoose');

// Define the schema for the buyer details
const buyerDetailsSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer', // Reference the Customer model
    required: true,
    unique: true,
  },
  location: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  detailsFilled: {
    type: Boolean,
    default: false,
  },
});

// Create and export the model
module.exports = mongoose.model('BuyerDetails', buyerDetailsSchema);
