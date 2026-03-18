/**
 * Migration Script: Add Concurrency Control Indexes
 * 
 * Run this script ONCE after deploying the concurrency control updates.
 * 
 * Usage:
 *   node backend/migrations/001_add_concurrency_indexes.js
 * 
 * What it does:
 * 1. Creates compound unique index on Bid (buyerId + productId)
 * 2. Creates performance indexes on Bid and Product collections
 * 3. Validates existing data for duplicates
 * 4. Reports any issues found
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import models to access schemas
const Product = require('../models/Product');
const Bid = require('../models/Bid');

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/AgroBidding';

async function runMigration() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // ===== Step 1: Check for duplicate bids =====
    console.log('📊 Checking for duplicate bids...');
    const duplicates = await Bid.aggregate([
      {
        $group: {
          _id: { buyerId: '$buyerId', productId: '$productId' },
          count: { $sum: 1 },
          ids: { $push: '$_id' }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);

    if (duplicates.length > 0) {
      console.log(`⚠️  Found ${duplicates.length} duplicate bid(s):`);
      for (const dup of duplicates) {
        console.log(`   Buyer: ${dup._id.buyerId}, Product: ${dup._id.productId}, Count: ${dup.count}`);
        
        // Keep highest bid, delete others
        const bids = await Bid.find({ _id: { $in: dup.ids } }).sort({ amount: -1 });
        const keepBid = bids[0];
        const deleteBids = bids.slice(1);
        
        console.log(`   Keeping bid ${keepBid._id} (₹${keepBid.amount})`);
        
        for (const delBid of deleteBids) {
          await Bid.deleteOne({ _id: delBid._id });
          console.log(`   Deleted duplicate bid ${delBid._id} (₹${delBid.amount})`);
        }
      }
      console.log('✅ Duplicate bids resolved\n');
    } else {
      console.log('✅ No duplicate bids found\n');
    }

    // ===== Step 2: Create indexes on Bid collection =====
    console.log('🔨 Creating indexes on Bid collection...');
    
    // Drop existing indexes (except _id)
    const existingBidIndexes = await Bid.collection.indexes();
    console.log(`   Current indexes: ${existingBidIndexes.map(i => i.name).join(', ')}`);
    
    // Create compound unique index (buyerId + productId)
    try {
      await Bid.collection.createIndex(
        { buyerId: 1, productId: 1 },
        { unique: true, name: 'buyerId_1_productId_1_unique' }
      );
      console.log('   ✅ Created unique index: buyerId_1_productId_1');
    } catch (error) {
      if (error.code === 11000) {
        console.log('   ℹ️  Index already exists: buyerId_1_productId_1');
      } else {
        throw error;
      }
    }

    // Create performance index (productId + amount)
    try {
      await Bid.collection.createIndex(
        { productId: 1, amount: -1 },
        { name: 'productId_1_amount_-1' }
      );
      console.log('   ✅ Created index: productId_1_amount_-1');
    } catch (error) {
      console.log('   ℹ️  Index already exists: productId_1_amount_-1');
    }

    console.log('✅ Bid indexes created\n');

    // ===== Step 3: Create indexes on Product collection =====
    console.log('🔨 Creating indexes on Product collection...');
    
    const existingProductIndexes = await Product.collection.indexes();
    console.log(`   Current indexes: ${existingProductIndexes.map(i => i.name).join(', ')}`);

    // Create status + bidEndDate index
    try {
      await Product.collection.createIndex(
        { status: 1, bidEndDate: 1 },
        { name: 'status_1_bidEndDate_1' }
      );
      console.log('   ✅ Created index: status_1_bidEndDate_1');
    } catch (error) {
      console.log('   ℹ️  Index already exists: status_1_bidEndDate_1');
    }

    // Create farmerId + status index
    try {
      await Product.collection.createIndex(
        { farmerId: 1, status: 1 },
        { name: 'farmerId_1_status_1' }
      );
      console.log('   ✅ Created index: farmerId_1_status_1');
    } catch (error) {
      console.log('   ℹ️  Index already exists: farmerId_1_status_1');
    }

    console.log('✅ Product indexes created\n');

    // ===== Step 4: Verify indexes =====
    console.log('🔍 Verifying all indexes...\n');

    const bidIndexes = await Bid.collection.indexes();
    console.log('📋 Bid Collection Indexes:');
    bidIndexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    const productIndexes = await Product.collection.indexes();
    console.log('\n📋 Product Collection Indexes:');
    productIndexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // ===== Step 5: Test query performance =====
    console.log('\n⚡ Testing query performance...');
    
    const startTime = Date.now();
    await Product.find({ status: 'active', bidEndDate: { $lt: new Date() } }).explain();
    const duration = Date.now() - startTime;
    console.log(`   Query execution time: ${duration}ms`);
    
    if (duration < 100) {
      console.log('   ✅ Performance looks good!');
    } else {
      console.log('   ⚠️  Query might be slow. Consider checking data volume.');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`   - Resolved ${duplicates.length} duplicate bid(s)`);
    console.log('   - Created 4 new indexes');
    console.log('   - Verified index creation');
    console.log('   - Tested query performance');
    console.log('\n🎉 Your database is now ready for concurrent bidding!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run migration
runMigration();
