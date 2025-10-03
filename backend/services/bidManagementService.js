const cron = require('node-cron');
const Product = require('../models/Product');
const Bid = require('../models/Bid');
const Customer = require('../models/Customer');

class BidManagementService {
  constructor(io) {
    this.io = io;
    this.startScheduledTasks();
  }

  startScheduledTasks() {
    // Run every minute to check for expired products
    cron.schedule('* * * * *', () => {
      this.processExpiredProducts();
    });

    console.log('🕒 Bid management scheduler started - checking every minute');
  }

  async processExpiredProducts() {
    try {
      // Find products that have expired but haven't been processed
      const expiredProducts = await Product.find({
        bidEndDate: { $lt: new Date() },
        status: 'active'
      });

      for (const product of expiredProducts) {
        await this.selectWinnerAndNotify(product);
      }
    } catch (error) {
      console.error('Error processing expired products:', error);
    }
  }

  async selectWinnerAndNotify(product) {
    try {
      console.log(`🏆 Processing expired product: ${product.name}`);

      // Get all bids for this product, sorted by amount (highest first)
      const allBids = await Bid.find({ productId: product._id })
        .populate('buyerId', 'name email')
        .sort({ amount: -1 });

      if (allBids.length === 0) {
        // No bids placed, mark product as expired
        product.status = 'expired';
        await product.save();
        
        // Notify farmers via socket
        this.io.emit('product-expired', {
          productId: product._id,
          productName: product.name,
          message: 'No bids were placed for this product'
        });
        
        return;
      }

      // Select the highest bid as winner
      const winningBid = allBids[0];
      const losingBids = allBids.slice(1);

      // Update winning bid
      winningBid.status = 'Won';
      winningBid.isWinningBid = true;
      winningBid.notified = true;
      await winningBid.save();

      // Update losing bids
      for (const bid of losingBids) {
        bid.status = 'Lost';
        bid.notified = true;
        await bid.save();
      }

      // Update product status
      product.status = 'sold';
      product.highestBid = {
        amount: winningBid.amount,
        buyerId: winningBid.buyerId._id,
        buyerName: winningBid.buyerName
      };
      await product.save();

      // Send real-time notifications
      await this.sendRealTimeNotifications(product, winningBid, losingBids);

      console.log(`✅ Winner selected for ${product.name}: ${winningBid.buyerName} with ₹${winningBid.amount}`);

    } catch (error) {
      console.error(`Error selecting winner for product ${product._id}:`, error);
    }
  }

  async sendRealTimeNotifications(product, winningBid, losingBids) {
    // Notify winner
    this.io.emit('bid-result', {
      type: 'winner',
      buyerId: winningBid.buyerId._id,
      productId: product._id,
      productName: product.name,
      bidAmount: winningBid.amount,
      message: `🎉 Congratulations! You won the bid for "${product.name}" with ₹${winningBid.amount}`,
      timestamp: new Date()
    });

    // Notify losers
    for (const bid of losingBids) {
      this.io.emit('bid-result', {
        type: 'loser',
        buyerId: bid.buyerId._id,
        productId: product._id,
        productName: product.name,
        bidAmount: bid.amount,
        winningAmount: winningBid.amount,
        message: `😔 You didn't win the bid for "${product.name}". Winning bid: ₹${winningBid.amount}`,
        timestamp: new Date()
      });
    }

    // Notify farmer about sale
    this.io.emit('product-sold', {
      farmerId: product.farmerId,
      productId: product._id,
      productName: product.name,
      winnerName: winningBid.buyerName,
      finalAmount: winningBid.amount,
      totalBids: losingBids.length + 1,
      message: `🎊 Your product "${product.name}" has been sold to ${winningBid.buyerName} for ₹${winningBid.amount}`,
      timestamp: new Date()
    });

    // Broadcast to all users watching this product
    this.io.to(`product-${product._id}`).emit('auction-ended', {
      productId: product._id,
      productName: product.name,
      winner: {
        name: winningBid.buyerName,
        amount: winningBid.amount
      },
      totalBids: losingBids.length + 1,
      timestamp: new Date()
    });
  }

  // Manual trigger for testing
  async triggerWinnerSelection(productId) {
    try {
      const product = await Product.findById(productId);
      if (product && product.status === 'active') {
        await this.selectWinnerAndNotify(product);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error in manual trigger:', error);
      return false;
    }
  }
}

module.exports = BidManagementService;
