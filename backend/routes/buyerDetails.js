const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth'); // Middleware for token authentication
const BuyerDetails = require('../models/BuyerDetails'); // Import BuyerDetails schema

// Add or update buyer details
router.post('/update-details', authenticateToken, async (req, res) => {
  try {
    const { location, phone, address } = req.body;

    if (!location || !phone || !address) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const buyerId = req.user.id;

    // Check if details already exist for the buyer
    let buyerDetails = await BuyerDetails.findOne({ buyerId });

    if (buyerDetails) {
      // Update existing details
      buyerDetails.location = location;
      buyerDetails.phone = phone;
      buyerDetails.address = address;
      buyerDetails.detailsFilled = true; // Ensure this is set
    } else {
      // Create new details
      buyerDetails = new BuyerDetails({
        buyerId,
        location,
        phone,
        address,
        detailsFilled: true, // Ensure this is set
      });
    }

    await buyerDetails.save();
    res.status(200).json({ message: 'Buyer details saved successfully' });
  } catch (error) {
    console.error('Error saving buyer details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get buyer details
router.get('/getName', authenticateToken, async (req, res) => {
  try {
    const buyerId = req.user.id; // Extract buyer ID from the token

    // Fetch buyer details and populate only the 'name' field from the Customer model
    const buyerDetails = await BuyerDetails.findOne({ buyerId }).populate('buyerId', 'name');
    
    if (!buyerDetails) {
      return res.status(404).json({ message: 'Buyer details not found' });
    }

    // Return only the buyer name
    res.status(200).json({
      buyerName: buyerDetails.buyerId.name,
    });
  } catch (error) {
    console.error('Error fetching buyer details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
