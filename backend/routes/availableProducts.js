const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/auth');


// Models
const Product = require('../models/Product');
const Bid = require('../models/Bid');


// Route: Fetch products by category or all products
router.get('/category/:category', authenticateToken, async (req, res) => {
    try {
      const { category } = req.params;
  
      // Fetch all products if "All" is selected
      const products = category === 'All'
        ? await Product.find()
        : await Product.find({ category }); // Fetch products filtered by category
  
      // Add full URL for the video field
      const productsWithFullVideoPath = products.map(product => ({
        ...product.toObject(),
        video: `${req.protocol}://${req.get('host')}/${product.video}`, // Construct full video URL
      }));
  
      res.status(200).json(productsWithFullVideoPath);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
// Route: Place a bid on a product
router.post('/bid', authenticateToken, async (req, res) => {
  const { productId, amount } = req.body;
  const buyerId = req.user.id; // Get the buyer ID from the token

  if (!productId || !amount || amount <= 0) {
    return res.status(400).json({ message: 'Invalid bid amount or product' });
  }

  try {
    // Check if the product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Create the new bid
    const newBid = new Bid({
      productId,
      buyerId,
      amount,
    });

    // Save the bid to the database
    await newBid.save();

    res.status(201).json({ message: 'Bid placed successfully!' });
  } catch (error) {
    console.error('Error placing bid:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Route: Fetch all available product categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    console.log('Categories fetched:', categories);
    

    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
