require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
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
const BidManagementService = require('./services/bidManagementService');
//const helmet = require('helmet');

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:3000',
  ...(process.env.FRONTEND_URLS
    ? process.env.FRONTEND_URLS.split(',').map(origin => origin.trim()).filter(Boolean)
    : []),
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.trim()] : []),
];

const uniqueAllowedOrigins = [...new Set(allowedOrigins)];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || uniqueAllowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
};

// Initialize Socket.IO with CORS configuration
const io = socketIo(server, {
  cors: corsOptions,
});

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use('/uploads', (req, res, next) => {
  res.type(mime.getType(req.path));
  next();
}, express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// MongoDB connection
const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/AgroBidding';
mongoose.connect(mongoURI)
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
// Initialize Bid Management Service
const bidManagementService = new BidManagementService(io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join product room for real-time updates
  socket.on('join-product', (productId) => {
    socket.join(`product-${productId}`);
    console.log(`User ${socket.id} joined product room: product-${productId}`);
  });

  // Leave product room
  socket.on('leave-product', (productId) => {
    socket.leave(`product-${productId}`);
    console.log(`User ${socket.id} left product room: product-${productId}`);
  });

  // Join user-specific room for personal notifications
  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${socket.id} joined personal room: user-${userId}`);
  });

  // Manual trigger for testing (admin only)
  socket.on('trigger-winner-selection', async (productId) => {
    const success = await bidManagementService.triggerWinnerSelection(productId);
    socket.emit('trigger-result', { success, productId });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
