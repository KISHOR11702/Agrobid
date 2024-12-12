const mongoose = require('mongoose');

// Define the schema for the customer (farmer/buyer)
const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  age: {
    type: Number,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
    enum: ['farmer', 'buyer'], // Farmer or buyer roles
  },
  buyerDetails: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BuyerDetails', // Reference to the Buyer schema
  },
});

// Create and export the model
module.exports = mongoose.model('Customer', customerSchema);
