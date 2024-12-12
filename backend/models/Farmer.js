const mongoose = require('mongoose');

// Define the schema for the farmer details
const farmerDetailsSchema = new mongoose.Schema({
  farmerId: {
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
module.exports = mongoose.model('FarmerDetails', farmerDetailsSchema);
