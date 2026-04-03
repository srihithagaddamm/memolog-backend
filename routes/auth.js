// routes/auth.js — Signup, Login, Google OAuth
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper: generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d'
  });
};

// Helper: safe user object to send back (no password/pin)
const safeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  authMethod: user.authMethod,
  preferences: user.preferences,
  currentStreak: user.currentStreak,
  totalEntries: user.totalEntries
});

// ─────────────────────────────────────────
// POST /api/auth/signup
// Body: { name, email, password, pin? }
// ─────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, pin } = req.body;

    // Validate inputs
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check if email already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      pin: pin || undefined,
      authMethod: 'email'
    });

    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: safeUser(user)
    });

  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ error: 'Could not create account. Please try again.' });
  }
});

// ─────────────────────────────────────────
// POST /api/auth/login
// Body: { email, password }
// ─────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user (include password for comparison)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || user.authMethod !== 'email') {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check password
    const isMatch = await user.checkPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user._id);

    res.json({
      message: 'Logged in successfully!',
      token,
      user: safeUser(user)
    });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ─────────────────────────────────────────
// POST /api/auth/google
// Body: { credential } — Google ID token from frontend
// ─────────────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required.' });
    }

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const { name, email, sub: googleId } = ticket.getPayload();

    // Find existing user or create new one
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      // Update googleId if they previously signed up with email
      if (!user.googleId) {
        user.googleId = googleId;
        user.authMethod = 'google';
        await user.save();
      }
    } else {
      // New user via Google
      user = await User.create({
        name,
        email,
        googleId,
        authMethod: 'google'
      });
    }

    const token = generateToken(user._id);

    res.json({
      message: 'Google sign-in successful!',
      token,
      user: safeUser(user)
    });

  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ error: 'Google sign-in failed. Please try again.' });
  }
});

// ─────────────────────────────────────────
// GET /api/auth/me — get current user
// ─────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  res.json({ user: safeUser(req.user) });
});

// ─────────────────────────────────────────
// POST /api/auth/verify-pin
// Body: { pin }
// ─────────────────────────────────────────
router.post('/verify-pin', protect, async (req, res) => {
  try {
    const { pin } = req.body;
    const user = await User.findById(req.user._id).select('+pin');

    if (!user.pin) {
      return res.json({ valid: true, message: 'No PIN set.' });
    }

    const isValid = await user.checkPin(pin);
    res.json({ valid: isValid });

  } catch (err) {
    res.status(500).json({ error: 'PIN verification failed.' });
  }
});

module.exports = router;
