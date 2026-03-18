const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const Product = require('../models/Product');
const cloudinary = require('../config/cloudinary');

const getCloudinaryPublicIdFromUrl = (videoUrl) => {
  if (!videoUrl) return null;

  try {
    const parsedUrl = new URL(videoUrl);
    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    const uploadIndex = segments.indexOf('upload');

    if (uploadIndex === -1 || uploadIndex === segments.length - 1) {
      return null;
    }

    let publicIdSegments = segments.slice(uploadIndex + 1);
    const versionIndex = publicIdSegments.findIndex(segment => /^v\d+$/.test(segment));

    if (versionIndex !== -1) {
      publicIdSegments = publicIdSegments.slice(versionIndex + 1);
    }

    if (publicIdSegments.length === 0) {
      return null;
    }

    const lastSegmentIndex = publicIdSegments.length - 1;
    publicIdSegments[lastSegmentIndex] = publicIdSegments[lastSegmentIndex].replace(/\.[^/.]+$/, '');

    return publicIdSegments.join('/');
  } catch (error) {
    return null;
  }
};

const hasCloudinaryConfig = () => (
  (process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_NAME) &&
  (process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_KEY) &&
  (process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET)
);

// Fetch all products for the logged-in farmer
router.get('/', authenticateToken, async (req, res) => {
  try {
    const farmerId = req.user.id; // Get farmer ID from token
    const products = await Product.find({ farmerId });
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Fetch a single product by ID (for viewing bids)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId).populate('farmerId', 'name');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.status(200).json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a product
router.put('/:id', authenticateToken, async (req, res) => {
  const productId = req.params.id;
  const { name, price, quantity, unit } = req.body;

  try {
    const product = await Product.findOne({ _id: productId, farmerId: req.user.id });

    if (!product) {
      return res.status(404).json({ message: 'Product not found or you are not authorized to update it.' });
    }

    // Update the product details
    product.name = name || product.name;
    product.price = price || product.price;
    product.quantity = quantity || product.quantity;
    product.unit = unit || product.unit;

    await product.save();

    res.status(200).json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a product
router.delete('/:id', authenticateToken, async (req, res) => {
  const productId = req.params.id;

  try {
    const product = await Product.findOne({ _id: productId, farmerId: req.user.id });

    if (!product) {
      return res.status(404).json({ message: 'Product not found or you are not authorized to delete it.' });
    }

    if (hasCloudinaryConfig()) {
      const publicId = product.cloudinaryPublicId || getCloudinaryPublicIdFromUrl(product.video);

      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
        } catch (cloudinaryError) {
          console.error('Error deleting Cloudinary video asset:', cloudinaryError.message);
        }
      }
    }

    await Product.deleteOne({ _id: productId, farmerId: req.user.id });

    res.status(200).json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Fetch products by farmer ID (for buyers to view farmer's products)
router.get('/farmer/:farmerId', authenticateToken, async (req, res) => {
  try {
    const { farmerId } = req.params;
    const products = await Product.find({ farmerId }).populate('farmerId', 'name');
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching farmer products:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
