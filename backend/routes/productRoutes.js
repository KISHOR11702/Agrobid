const express = require('express');
const multer = require('multer');
const Product = require('../models/Product');
const authenticateToken = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads'); 
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath); // Specify upload directory
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // Limit file size to 50MB
  fileFilter: (req, file, cb) => {
    // Ensure the file is a video
    const fileTypes = /mp4|mkv|avi|mov/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = fileTypes.test(file.mimetype);

    if (extname && mimeType) {
      return cb(null, true);
    }
    cb(new Error('Only video files are allowed!'));
  },
});

// Route to add a new product
router.post('/add-product', authenticateToken, upload.single('video'), async (req, res) => {
  try {
    const { name, price, quantity, category, unit, duration } = req.body;
    const farmerId = req.user.id;

    // Check if all required fields are present
    if (!name || !price || !quantity || !category || !unit || !duration || !req.file) {
      return res.status(400).json({ message: 'All fields, including video, are required' });
    }

    // Create a new product
    const newProduct = new Product({
      name,
      price,
      quantity,
      category,
      unit,
      video: req.file.path, // Save the video file path
      farmerId,
      duration,
    });

    // Save the product to the database
    await newProduct.save();

    res.status(201).json({ message: 'Product added successfully!' });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Route to get all products (excluding expired ones)
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find();

    // Filter out expired products using the isExpired method
    const validProducts = products.filter(product => !product.isExpired());

    res.status(200).json(validProducts);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
