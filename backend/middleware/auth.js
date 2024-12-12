const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided or invalid format' });
  }

  const token = authHeader.split(' ')[1]; // Extract the token

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify token
    console.log('Decoded Token:', decoded);
    req.user = { id: decoded.userId }; // Attach farmer ID to request object
    next();
  } catch (error) {
    console.error('JWT verification failed:', error);
    res.status(403).json({ message: 'Token is invalid or expired' });
  }
};

module.exports = authenticateToken;
