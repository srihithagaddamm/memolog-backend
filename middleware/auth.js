// middleware/auth.js — Protects private routes
// Every request to protected routes must include: Authorization: Bearer <token>

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    // 1. Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not logged in. Please sign in first.' });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }

    // 3. Find user
    const user = await User.findById(decoded.id).select('-password -pin');
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User account not found or disabled.' });
    }

    // 4. Attach user to request
    req.user = user;
    next();

  } catch (err) {
    res.status(500).json({ error: 'Authentication check failed.' });
  }
};

module.exports = { protect };
