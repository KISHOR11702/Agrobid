const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer'); // Customer model
const FarmerDetails = require('../models/Farmer'); // FarmerDetails model
const authenticateToken = require('../middleware/auth'); // JWT middleware

// Route to fetch farmer details
router.get('/details', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // Extract farmer ID from the token
    console.log('Logged-in User ID:', userId);

    const farmer = await Customer.findById(userId);
    console.log('Fetched Farmer:', farmer);

    if (!farmer || farmer.role !== 'farmer') {
      return res.status(404).json({ message: 'Farmer not found or not authorized' });
    }

    res.status(200).json({ farmerName: farmer.name });
  } catch (error) {
    console.error('Error fetching farmer details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Route to check if farmer details are filled
router.get('/check-details', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // Extract farmer ID from the token
    console.log('Logged-in User ID for check-details:', userId);

    const farmerDetails = await FarmerDetails.findOne({ farmerId: userId });
    console.log('Farmer Details:', farmerDetails);

    if (!farmerDetails || !farmerDetails.detailsFilled) {
      return res.json({ detailsFilled: false });
    }

    res.json({ detailsFilled: true });
  } catch (err) {
    console.error('Error in /check-details:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
