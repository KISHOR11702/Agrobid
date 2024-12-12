const express = require('express');
const authenticateToken = require('../middleware/auth');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const BuyerDetails = require('../models/BuyerDetails'); // Import BuyerDetails schema

// const Bid = require('../models/Bid');

const router = express.Router();

// Route to fetch buyer details
router.get('/details', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // Extract buyer ID from the token
    const buyer = await Customer.findById(userId);

    const buyerDetails = await BuyerDetails.findOne({ buyerId: userId });
    console.log('Farmer Details:', buyerDetails);

    if (!buyerDetails || !buyerDetails.detailsFilled) {
      return res.json({ detailsFilled: false });
    }

    res.json({ detailsFilled: true });
  } catch (error) {
    console.error('Error fetching buyer details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Route to fetch available products
router.get('/available-products', authenticateToken, async (req, res) => {
  try {
    const products = await Product.find({}); // Fetch all products
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Route to fetch buyer's bids
router.get('/bids', authenticateToken, async (req, res) => {
  try {
    const buyerId = req.user.id;
    const bids = await Bid.find({ buyerId }).populate('productId');
    res.status(200).json(bids);
  } catch (error) {
    console.error('Error fetching bids:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Route to fetch winning bids
router.get('/winning-bids', authenticateToken, async (req, res) => {
  try {
    const buyerId = req.user.id;
    const winningBids = await Bid.find({ buyerId, isWinningBid: true }).populate('productId');
    res.status(200).json(winningBids);
  } catch (error) {
    console.error('Error fetching winning bids:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
