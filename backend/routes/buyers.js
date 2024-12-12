const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const MinimalBuyerDetails = require('../models/minimalBuyerDetails');
const Bid = require('../models/Bid'); // Assuming you have a Bid model
const Buyer = require('../models/BuyerDetails'); // Import BuyerDetails schema

// Fetch buyer details
router.get('/:buyerId', authenticateToken, async (req, res) => {
  try {
    const { buyerId } = req.params;

    const buyerDetails = await MinimalBuyerDetails.findOne({ buyerId });
    if (!buyerDetails) {
      return res.status(404).json({ message: 'Buyer details not found' });
    }

    res.status(200).json({
      name: buyerDetails.buyerId.name,
      phone: buyerDetails.phone,
      address: buyerDetails.address,
    });
  } catch (error) {
    console.error('Error fetching buyer details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// Get buyers who placed bids for a specific product
// Get bids for a specific product with buyer details
// Get buyers who placed bids for a specific product
router.get('/product/:productId/buyers', authenticateToken, async (req, res) => {
  try {
    const productId = req.params.productId; // Get the product ID from request parameters

    // Find all bids for the given product
    const bids = await Bid.find({ productId });

    if (bids.length === 0) {
      return res.status(404).json({ message: 'No bids found for this product.' });
    }

    // Get unique buyer IDs from the bids
    const buyerIds = [...new Set(bids.map((bid) => bid.buyerId))];

    // Fetch details of all buyers who placed bids
    const buyers = await Buyer.find({ _id: { $in: buyerIds } }).select(
      'name email phone location address'
    ); // Include only specific fields

    res.status(200).json({ buyers });
  } catch (error) {
    console.error('Error fetching buyers for the product:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


module.exports = router;
