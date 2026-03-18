const cron = require('node-cron');
const Product = require('../models/Product');
const Bid = require('../models/Bid');
const Customer = require('../models/Customer');

/**
 * Bid Management Service with Transaction-based Winner Selection
 * 
 * Concurrency Strategy:
 * ----------------------
 * 1. MongoDB Transactions: All winner selection operations are atomic
 * 2. Status Gating: Product status changed to 'processing' to prevent double-processing
 * 3. Bulk Operations: All losing bids updated in single atomic operation
 * 4. Retry Logic: Automatic retry (3 attempts) on version conflicts
 * 5. Parallel Processing: Multiple expired products processed concurrently with Promise.allSettled
 * 6. Rollback Safety: Failed transactions roll back product status automatically
 * 
 * Race Condition Protection:
 * - Multiple cron runs → status gating prevents double-processing same product
 * - Concurrent winner selection → atomic status update ensures single winner
 * - Transaction failures → automatic rollback maintains data consistency
 */

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

      // Process each product independently to avoid transaction conflicts
      const results = await Promise.allSettled(
        expiredProducts.map(product => this.selectWinnerAndNotify(product))
      );

      // Log any failures
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Failed to process product ${expiredProducts[index]._id}:`, result.reason);
        }
      });

    } catch (error) {
      console.error('Error processing expired products:', error);
    }
  }

  async selectWinnerAndNotify(product) {
    const mongoose = require('mongoose');
    const session = await mongoose.startSession();
    
    try {
      console.log(`🏆 Processing expired product: ${product.name}`);

      // Retry logic for optimistic concurrency
      let retries = 3;
      let result = null;

      while (retries > 0) {
        try {
          session.startTransaction();

          // Atomically update product status to prevent double-processing
          const updatedProduct = await Product.findOneAndUpdate(
            { 
              _id: product._id, 
              status: 'active',
              bidEndDate: { $lt: new Date() }
            },
            { $set: { status: 'processing' } },
            { new: true, session }
          );

          if (!updatedProduct) {
            // Product already processed or still active
            await session.abortTransaction();
            console.log(`Product ${product._id} already processed or not yet expired`);
            return;
          }

          // Get all bids for this product, sorted by amount (highest first)
          const allBids = await Bid.find({ productId: product._id })
            .populate('buyerId', 'name email')
            .sort({ amount: -1 })
            .session(session);

          if (allBids.length === 0) {
            // No bids placed, mark product as expired
            await Product.findByIdAndUpdate(
              product._id,
              { $set: { status: 'expired' } },
              { session }
            );
            
            await session.commitTransaction();
            
            // Notify farmers via socket (after transaction)
            this.io.emit('product-expired', {
              productId: product._id,
              productName: product.name,
              message: 'No bids were placed for this product'
            });
            
            result = { noBids: true };
            break;
          }

          // Select the highest bid as winner
          const winningBid = allBids[0];
          const losingBids = allBids.slice(1);

          // Update winning bid atomically
          await Bid.findByIdAndUpdate(
            winningBid._id,
            {
              $set: {
                status: 'Won',
                isWinningBid: true,
                notified: true
              }
            },
            { session }
          );

          // Bulk update losing bids atomically
          if (losingBids.length > 0) {
            await Bid.updateMany(
              { 
                _id: { $in: losingBids.map(bid => bid._id) },
                productId: product._id
              },
              {
                $set: {
                  status: 'Lost',
                  isWinningBid: false,
                  notified: true
                }
              },
              { session }
            );
          }

          // Update product status to sold with winner details
          await Product.findByIdAndUpdate(
            product._id,
            {
              $set: {
                status: 'sold',
                'highestBid.amount': winningBid.amount,
                'highestBid.buyerId': winningBid.buyerId._id,
                'highestBid.buyerName': winningBid.buyerName
              }
            },
            { session }
          );

          // Commit transaction
          await session.commitTransaction();

          result = {
            product: updatedProduct,
            winningBid,
            losingBids
          };

          console.log(`✅ Winner selected for ${product.name}: ${winningBid.buyerName} with ₹${winningBid.amount}`);
          break;

        } catch (error) {
          await session.abortTransaction();

          // Handle optimistic concurrency errors
          if (error.name === 'VersionError' || error.code === 11000) {
            retries--;
            if (retries > 0) {
              console.log(`Retrying winner selection for product ${product._id}. Retries left: ${retries}`);
              await new Promise(resolve => setTimeout(resolve, 150));
              continue;
            }
          }
          throw error;
        }
      }

      if (!result) {
        throw new Error(`Failed to process winner selection after retries for product ${product._id}`);
      }

      // Send real-time notifications (after successful transaction)
      if (!result.noBids) {
        await this.sendRealTimeNotifications(result.product, result.winningBid, result.losingBids);
      }

    } catch (error) {
      console.error(`Error selecting winner for product ${product._id}:`, error);
      
      // Rollback product status if something went wrong
      try {
        await Product.findByIdAndUpdate(product._id, { $set: { status: 'active' } });
      } catch (rollbackError) {
        console.error(`Failed to rollback product ${product._id}:`, rollbackError);
      }
      
      throw error;
    } finally {
      session.endSession();
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

  // Manual trigger for testing (with transaction safety)
  async triggerWinnerSelection(productId) {
    try {
      const product = await Product.findOne({ 
        _id: productId,
        status: 'active'
      });
      
      if (product) {
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
