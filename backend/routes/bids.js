const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth'); // Middleware for token authentication
const Product = require('../models/Product'); // Assuming you have a Product model
const Bid = require('../models/Bid'); // Assuming you have a Bid model
const Buyer = require('../models/BuyerDetails'); // Assuming you have a Buyer model
const Customer = require('../models/Customer'); // Adjust the path as needed
const mongoose = require('mongoose');

// Place a bid
router.post('/bid', authenticateToken, async (req, res) => {
  try {
    const { productId, amount } = req.body;

    // Check if productId and amount are provided
    if (!productId || !amount) {
      return res.status(400).json({ message: 'Product ID and bid amount are required.' });
    }

    // Validate bid amount
    if (amount <= 0) {
      return res.status(400).json({ message: 'Bid amount must be greater than zero.' });
    }

    // Get buyer ID from the token
    const buyerId = req.user.id;
    if (!buyerId) {
      return res.status(400).json({ message: 'Authentication failed. Buyer ID not found.' });
    }

    // Verify if the product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Check if the buyer has already placed a bid on this product
    const existingBid = await Bid.findOne({ buyerId, productId });
    if (existingBid) {
      // Update the existing bid with the new amount
      existingBid.amount = amount;
      await existingBid.save();

      return res.status(200).json({ message: 'Bid updated successfully!', bid: existingBid });
    }

    // Create a new bid if no existing bid is found
    const newBid = new Bid({
      buyerId,  // Make sure buyerId is set here
      productId,
      amount,
    });

    // Save the bid to the database
    await newBid.save();

    res.status(201).json({ message: 'Bid placed successfully!', bid: newBid });
  } catch (error) {
    console.error('Error placing bid:', error.message, error.stack);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Fetch bids for a specific product and buyers
router.get('/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Get all bids for the product
    const bids = await Bid.find({ productId })
      .populate({
        path: 'buyerId',
        select: 'name email', 
        },
      )// Populate buyer details (name, phone, location)
      .exec();

    if (!bids || bids.length === 0) {
      return res.status(200).json([]); // Return empty array if no bids are found
    }

    res.status(200).json(bids); // Return the list of bids with populated buyer details
  } catch (error) {
    console.error('Error fetching bids:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
//Fetch buyer details
router.get('/buyer/:buyerId', authenticateToken, async (req, res) => {
  try {
    const { buyerId } = req.params;

    // Fetch buyer details from BuyerDetails model
    const buyerDetails = await Buyer.findOne({ buyerId }).exec();
    if (!buyerDetails) {
      return res.status(404).json({ message: 'Buyer details not found.' });
    }

    // Fetch buyer name and email from Customer model
    const customerDetails = await Customer.findById(buyerId, 'name email').exec();
    if (!customerDetails) {
      return res.status(404).json({ message: 'Customer details not found.' });
    }

    // Combine details from both schemas
    const fullBuyerDetails = {
      name: customerDetails.name,
      email: customerDetails.email,
      location: buyerDetails.location,
      phone: buyerDetails.phone,
      address: buyerDetails.address,
    };
    console.log(buyerDetails);

    res.status(200).json(fullBuyerDetails);
  } catch (error) {
    console.error('Error fetching buyer details:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
  
});

// Route to select a winning bid
router.post('/select', authenticateToken, async (req, res) => {
  try {
    const { bidId } = req.body;

    if (!bidId) {
      return res.status(400).json({ message: 'Bid ID is required.' });
    }

    // Find the bid to mark as the winning bid
    const winningBid = await Bid.findById(bidId);
    if (!winningBid) {
      return res.status(404).json({ message: 'Bid not found.' });
    }

    // Update the winning bid
    winningBid.status = 'Won';
    winningBid.isWinningBid = true;  // Mark this bid as the winning bid
  
    await winningBid.save();

    // Mark all other bids for the same product as "Lost"
    await Bid.updateMany(
      { productId: winningBid.productId, _id: { $ne: bidId } },
      { $set: { status: 'Lost', isWinningBid: false } } // Set isWinningBid to false for other bids
    );

    // Optionally, update the product's status to "Sold" or another appropriate value
    await Product.findByIdAndUpdate(winningBid.productId, { status: 'Sold' });

    res.status(200).json({ message: 'Winning bid selected successfully!' });
  } catch (error) {
    console.error('Error selecting winning bid:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/your-bids/:buyerId', authenticateToken, async (req, res) => {
  try {
    const buyerId = req.user.id;
    console.log(buyerId);

    // Validate buyerId
    if (!buyerId || !mongoose.Types.ObjectId.isValid(buyerId)) {
      return res.status(400).json({ message: 'Invalid buyer ID' });
    }

    // Fetch bids for the buyer with product details
    const bids = await Bid.find({ buyerId }).populate({
      path: 'productId',
      select: 'name price description', // Only fetch necessary fields
    });
    console.log("Buyer ID extracted:", buyerId);

    if (!bids.length) {
      return res.status(404).json({ message: 'No bids found' });
    }

    // Format response data
    const response = bids.map((bid) => ({
      bidId: bid._id,
      productName: bid.productId?.name || 'Unknown Product',
      productDescription: bid.productId?.description || 'N/A',
      bidAmount: bid.amount,
      status: bid.status,
      isWinningBid: bid.isWinningBid,
    }));
    console.log("Bids with populated product:", bids);


    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching bids:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
  

});




module.exports = router;
