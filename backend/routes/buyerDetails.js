const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth'); // Middleware for token authentication
const BuyerDetails = require('../models/BuyerDetails'); // Import BuyerDetails schema

// Add or update buyer details
router.post('/update-details', authenticateToken, async (req, res) => {
  try {
    const {
      phoneNumber,
      alternativePhoneNumber,
      address,
      city,
      state,
      pinCode,
      companyName,
      businessType,
      gstNumber,
      interestedCategories,
      minBudget,
      maxBudget,
      purchaseFrequency,
      // Legacy fields for backward compatibility
      location,
      phone
    } = req.body;

    // Validate required fields
    if (!phoneNumber || !address || !city || !state) {
      return res.status(400).json({ 
        message: 'Phone number, address, city, and state are required fields' 
      });
    }

    const buyerId = req.user.id;

    // Check if details already exist for the buyer
    let buyerDetails = await BuyerDetails.findOne({ buyerId });

    if (buyerDetails) {
      // Update existing details
      buyerDetails.phoneNumber = phoneNumber;
      buyerDetails.alternativePhoneNumber = alternativePhoneNumber;
      buyerDetails.address = address;
      buyerDetails.city = city;
      buyerDetails.state = state;
      buyerDetails.pinCode = pinCode;
      buyerDetails.companyName = companyName;
      buyerDetails.businessType = businessType;
      buyerDetails.gstNumber = gstNumber;
      buyerDetails.interestedCategories = interestedCategories || [];
      buyerDetails.minBudget = minBudget;
      buyerDetails.maxBudget = maxBudget;
      buyerDetails.purchaseFrequency = purchaseFrequency;
      // Legacy fields
      buyerDetails.location = location || `${city}, ${state}`;
      buyerDetails.phone = phone || phoneNumber;
      buyerDetails.detailsFilled = true;
    } else {
      // Create new details
      buyerDetails = new BuyerDetails({
        buyerId,
        phoneNumber,
        alternativePhoneNumber,
        address,
        city,
        state,
        pinCode,
        companyName,
        businessType,
        gstNumber,
        interestedCategories: interestedCategories || [],
        minBudget,
        maxBudget,
        purchaseFrequency,
        // Legacy fields
        location: location || `${city}, ${state}`,
        phone: phone || phoneNumber,
        detailsFilled: true,
      });
    }

    await buyerDetails.save();
    res.status(200).json({ message: 'Complete buyer details saved successfully' });
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
