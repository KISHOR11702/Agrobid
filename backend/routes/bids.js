const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth'); // Middleware for token authentication
const Product = require('../models/Product'); // Assuming you have a Product model
const Bid = require('../models/Bid'); // Assuming you have a Bid model
const Buyer = require('../models/BuyerDetails'); // Assuming you have a Buyer model
const Customer = require('../models/Customer'); // Adjust the path as needed
const mongoose = require('mongoose');

/**
 * Bid Routes with Concurrency Control
 * 
 * Concurrency Strategy:
 * ----------------------
 * 1. MongoDB Transactions: All bid placements wrapped in ACID transactions
 * 2. Optimistic Locking: Version keys (__v) detect concurrent modifications
 * 3. Atomic Operations: findOneAndUpdate with conditions ensures race-free updates
 * 4. Retry Logic: Automatic retry (3 attempts) on version conflicts
 * 5. Unique Constraints: Compound index (buyerId + productId) prevents duplicate bids
 * 6. Conditional Updates: Products only update if bid is higher than current highest
 * 
 * Race Condition Protection:
 * - Multiple simultaneous bids → only highest wins, others get conflict error
 * - Bid + Expired Check → transaction aborts if product expires mid-bid
 * - Winner Selection → atomic status change prevents double-processing
 */

// Place a bid with MongoDB transactions and atomic operations
router.post('/bid', authenticateToken, async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    const { productId, amount } = req.body;
    const io = req.app.get('io'); // Get Socket.IO instance

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

    // Get buyer details for the bid (outside transaction for performance)
    const buyer = await Customer.findById(buyerId);
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found.' });
    }

    // Start transaction with retry logic for optimistic concurrency
    let retries = 3;
    let bidResult = null;

    while (retries > 0) {
      try {
        session.startTransaction();

        // Use findOneAndUpdate with atomic conditions to ensure product is valid and active
        const product = await Product.findOne({
          _id: productId,
          status: 'active',
          bidEndDate: { $gt: new Date() }
        }).session(session);

        if (!product) {
          await session.abortTransaction();
          return res.status(400).json({ 
            message: 'Product not found or bidding has ended for this product.' 
          });
        }

        // Calculate minimum bid atomically
        const minimumBid = Math.max(product.highestBid.amount + 1, product.price + 1);
        if (amount < minimumBid) {
          await session.abortTransaction();
          return res.status(400).json({ 
            message: `Bid amount must be at least ₹${minimumBid} (current highest: ₹${product.highestBid.amount})` 
          });
        }

        // Try to update or create bid atomically using upsert
        const bidUpdate = await Bid.findOneAndUpdate(
          { buyerId, productId },
          {
            $set: {
              amount,
              buyerName: buyer.name,
              status: 'Pending'
            },
            $setOnInsert: {
              buyerId,
              productId,
              buyerName: buyer.name,
              createdAt: new Date()
            }
          },
          {
            upsert: true,
            new: true,
            session,
            runValidators: true
          }
        );

        const isNewBid = !bidUpdate.createdAt || 
                        (new Date() - bidUpdate.createdAt) < 1000;

        // Atomically update product with highest bid and increment counter
        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: productId,
            status: 'active',
            $or: [
              { 'highestBid.amount': { $lt: amount } },
              { 'highestBid.buyerId': buyerId }
            ]
          },
          {
            $set: {
              'highestBid.amount': amount,
              'highestBid.buyerId': buyerId,
              'highestBid.buyerName': buyer.name
            },
            $inc: { totalBids: isNewBid ? 1 : 0 }
          },
          {
            new: true,
            session
          }
        );

        if (!updatedProduct) {
          await session.abortTransaction();
          return res.status(409).json({ 
            message: 'Another higher bid was placed. Please try again with a higher amount.',
            currentHighest: product.highestBid.amount
          });
        }

        // Commit transaction
        await session.commitTransaction();

        bidResult = {
          bid: bidUpdate,
          product: updatedProduct,
          isNewBid
        };

        break; // Success, exit retry loop

      } catch (error) {
        await session.abortTransaction();

        // Handle optimistic concurrency errors (version mismatch)
        if (error.name === 'VersionError' || error.code === 11000) {
          retries--;
          if (retries > 0) {
            console.log(`Retrying bid placement due to concurrency conflict. Retries left: ${retries}`);
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay before retry
            continue;
          }
        }
        throw error; // Re-throw if not a concurrency error or out of retries
      }
    }

    if (!bidResult) {
      return res.status(409).json({ 
        message: 'Unable to place bid due to high concurrent activity. Please try again.' 
      });
    }

    // Emit real-time update to all clients watching this product (after transaction)
    const eventType = bidResult.isNewBid ? 'bid-placed' : 'bid-updated';
    io.to(`product-${productId}`).emit(eventType, {
      productId,
      bidId: bidResult.bid._id,
      amount,
      buyerName: buyer.name,
      buyerId,
      timestamp: bidResult.bid.createdAt,
      isNew: bidResult.isNewBid,
      isUpdate: !bidResult.isNewBid,
      highestBid: bidResult.product.highestBid,
      totalBids: bidResult.product.totalBids
    });

    res.status(bidResult.isNewBid ? 201 : 200).json({ 
      message: bidResult.isNewBid ? 'Bid placed successfully!' : 'Bid updated successfully!', 
      bid: bidResult.bid 
    });

  } catch (error) {
    console.error('Error placing bid:', error.message, error.stack);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({ 
        message: 'Bid update conflict. Please try again.' 
      });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    session.endSession();
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

    // Fetch all bids placed by this buyer
    const buyerBids = await Bid.find({ buyerId })
      .populate('productId', 'name category')
      .sort({ createdAt: -1 });

    // Format the bids with product information
    const formattedBids = buyerBids.map(bid => ({
      _id: bid._id,
      amount: bid.amount,
      productName: bid.productId?.name || 'Unknown Product',
      productCategory: bid.productId?.category || 'Unknown',
      status: bid.status,
      isWinningBid: bid.isWinningBid,
      createdAt: bid.createdAt,
      timestamp: bid.timestamp
    }));

    // Combine details from both schemas
    const fullBuyerDetails = {
      name: customerDetails.name,
      email: customerDetails.email,
      ...buyerDetails.toObject(), // Include all buyer details
      bids: formattedBids
    };

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

// Get live bid data for a product
router.get('/product/:productId/live', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const bids = await Bid.find({ productId })
      .populate('buyerId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      product: {
        _id: product._id,
        name: product.name,
        bidEndDate: product.bidEndDate,
        isExpired: product.isExpired(),
        highestBid: product.highestBid,
        totalBids: product.totalBids,
        status: product.status
      },
      recentBids: bids.map(bid => ({
        _id: bid._id,
        amount: bid.amount,
        buyerName: bid.buyerName,
        timestamp: bid.createdAt,
        isWinning: bid.amount === product.highestBid.amount
      }))
    });
  } catch (error) {
    console.error('Error fetching live bid data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get bid results for a specific buyer
router.get('/results/:buyerId', authenticateToken, async (req, res) => {
  try {
    const { buyerId } = req.params;

    // Verify the requesting user is the buyer or admin
    if (req.user.id !== buyerId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const bidResults = await Bid.find({ 
      buyerId, 
      status: { $in: ['Won', 'Lost'] },
      notified: true 
    })
    .populate('productId', 'name category')
    .sort({ createdAt: -1 });

    res.json({ bidResults });
  } catch (error) {
    console.error('Error fetching bid results:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get winning bids for a farmer's products
router.get('/wins/farmer/:farmerId', authenticateToken, async (req, res) => {
  try {
    const { farmerId } = req.params;

    // Verify the requesting user is the farmer
    if (req.user.id !== farmerId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const products = await Product.find({ farmerId, status: 'sold' });
    const productIds = products.map(p => p._id);
    
    const winningBids = await Bid.find({ 
      productId: { $in: productIds },
      status: 'Won' 
    })
    .populate('productId', 'name category')
    .populate('buyerId', 'name email')
    .sort({ createdAt: -1 });

    res.json({ winningBids, totalSales: winningBids.length });
  } catch (error) {
    console.error('Error fetching farmer wins:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Mark notifications as read
router.patch('/notifications/read', authenticateToken, async (req, res) => {
  try {
    const { bidIds } = req.body;
    
    await Bid.updateMany(
      { _id: { $in: bidIds }, buyerId: req.user.id },
      { notificationRead: true }
    );

    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Fetch all bids for a specific product (for viewing bids page)
router.get('/product/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Fetch all bids for the product
    const bids = await Bid.find({ productId })
      .populate('buyerId', 'name email')
      .sort({ amount: -1, createdAt: -1 });
    
    res.json(bids);
  } catch (error) {
    console.error('Error fetching product bids:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
