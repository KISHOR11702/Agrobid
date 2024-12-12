const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const Product = require('../models/Product');

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
    const product = await Product.findOneAndDelete({ _id: productId, farmerId: req.user.id });

    if (!product) {
      return res.status(404).json({ message: 'Product not found or you are not authorized to delete it.' });
    }

    res.status(200).json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
