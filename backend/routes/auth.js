const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer'); // Import the Customer model
const bcrypt = require('bcryptjs'); // For hashing passwords

// Signup route
router.post('/signup', async (req, res) => {
  const { name, age, email, password, role } = req.body;

  try {
    // Validate input data
    if (!name || !age || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    // Check if the email already exists
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return res.status(400).json({ message: 'Email already in use.' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new customer
    const newCustomer = new Customer({
      name,
      age,
      email,
      password: hashedPassword,
      role,
    });

    // Save the customer in the database
    await newCustomer.save();

    res.status(201).json({ message: 'Signup successful!' });
  } catch (error) {
    console.error('Error during signup:', error.message);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user by email
    const user = await Customer.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Check if the password is correct
    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate a JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log('Generated token:', token);
    // Respond with the token and user role
    res.status(200).json({ token, role: user.role, farmerName: user.name });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// Forgot Password Route
// app.post('/api/auth/forgot-password', async (req, res) => {
//   const { email } = req.body;

//   // Validate email and send reset link logic here
//   // Example: send a password reset email with a token

//   res.status(200).send({ message: 'Password reset link sent to your email.' });
// });

module.exports = router;
