const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth'); // JWT middleware
const FarmerDetails = require('../models/Farmer'); // Import FarmerDetails model

// Add or update farmer details
router.post('/add-details', authenticateToken, async (req, res) => {
  try {
    const { location, phone, address } = req.body;

    if (!location || !phone || !address) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const farmerId = req.user.id;

    // Check if details already exist for the farmer
    let farmerDetails = await FarmerDetails.findOne({ farmerId });

    if (farmerDetails) {
      // Update existing details
      farmerDetails.location = location;
      farmerDetails.phone = phone;
      farmerDetails.address = address;
      farmerDetails.detailsFilled = true; // Ensure this is set
    } else {
      // Create new details
      farmerDetails = new FarmerDetails({
        farmerId,
        location,
        phone,
        address,
        detailsFilled: true, // Ensure this is set
      });
    }

    await farmerDetails.save();
    res.status(200).json({ message: 'Farmer details saved successfully' });
  } catch (error) {
    console.error('Error saving farmer details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
