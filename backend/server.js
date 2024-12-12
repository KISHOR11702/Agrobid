require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoute = require('./routes/auth'); // Import auth routes
const farmerRoutes = require('./routes/farmerRoutes'); // Import farmer routes
const farmerDetailsRoutes = require('./routes/farmerDetails'); // Import farmer details routes
const productRoutes = require('./routes/productRoutes'); // Import updated product routes
const buyerRoutes = require('./routes/buyerRoutes');
const buyerDetailsRoutes = require('./routes/buyerDetails'); // Import Buyer Details routes
const productsRoute = require('./routes/products');
const bidsRoute = require('./routes/bids');
const buyersRoute = require('./routes/buyers');
const availableProductRoutes = require('./routes/availableProducts'); // Updated path to the new file
const path = require('path');
const mime = require('mime');
//const helmet = require('helmet');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', (req, res, next) => {
  res.type(mime.getType(req.path));
  next();
}, express.static(path.join(__dirname, 'uploads')));
// MongoDB connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/AgroBidding';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoute); // Authentication routes
app.use('/api/farmer', farmerRoutes); // Farmer-specific routes
app.use('/api/farmer', farmerDetailsRoutes); // Farmer details routes
app.use('/api/products', productRoutes); // Product routes (Updated)
app.use('/api/buyer', buyerRoutes);
app.use('/api/buyer', buyerDetailsRoutes); // Add Buyer Details routes
app.use('/api/products', productsRoute);
app.use('/api/bids', bidsRoute);
app.use('/api/buyers', buyersRoute);
app.use('/api/availableProducts', availableProductRoutes); // New route for available products
// app.use(
//   helmet({
//     contentSecurityPolicy: {
//       directives: {
//         defaultSrc: ["'self'", 'data:', 'blob:', 'http:', 'https:'],
//         scriptSrc: ["'self'", 'http:', 'https:'],
//         styleSrc: ["'self'", 'http:', 'https:', "'unsafe-inline'"],
//         imgSrc: ["'self'", 'data:', 'http:', 'https:'],
//         mediaSrc: ["'self'", 'http:', 'https:'], // Add this for video sources
//       },
//     },
//   })
// );
// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
