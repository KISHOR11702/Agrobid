const express = require('express');
const multer = require('multer');
const Product = require('../models/Product');
const authenticateToken = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const cloudinary = require('../config/cloudinary');

const router = express.Router();

// Multer configuration for temporary file uploads before Cloudinary upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/tmp');
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

const removeTempFile = async (filePath) => {
  if (!filePath) return;

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Failed to remove temp upload file:', error.message);
    }
  }
};

// Route to add a new product
router.post('/add-product', authenticateToken, upload.single('video'), async (req, res) => {
  try {
    const { name, price, quantity, category, unit, bidEndDate } = req.body;
    const farmerId = req.user.id;

    // Check if all required fields are present
    if (!name || !price || !quantity || !category || !unit || !bidEndDate || !req.file) {
      return res.status(400).json({ message: 'All fields, including video, are required' });
    }

    // Validate that bidEndDate is in the future
    const endDate = new Date(bidEndDate);
    const currentDate = new Date();
    if (endDate <= currentDate) {
      return res.status(400).json({ message: 'Bid end date must be in the future' });
    }

    const hasCloudinaryConfig =
      (process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME) &&
      (process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_KEY) &&
      (process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET);

    if (!hasCloudinaryConfig) {
      await removeTempFile(req.file?.path);
      return res.status(500).json({ message: 'Cloudinary is not configured on the server' });
    }

    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'video',
      folder: 'agrobidding/products',
      use_filename: true,
      unique_filename: true,
    });

    // Create a new product
    const newProduct = new Product({
      name,
      price,
      quantity,
      category,
      unit,
      video: uploadResult.secure_url,
      cloudinaryPublicId: uploadResult.public_id,
      farmerId,
      bidEndDate: new Date(bidEndDate),
    });

    // Save the product to the database
    await newProduct.save();

    await removeTempFile(req.file?.path);

    res.status(201).json({ message: 'Product added successfully!' });
  } catch (error) {
    await removeTempFile(req.file?.path);
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
