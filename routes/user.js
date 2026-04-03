// routes/user.js — User profile and preferences
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Entry = require('../models/Entry');

router.use(protect);

// ─────────────────────────────────────────
// GET /api/user/profile
// Get user's full profile + stats
// ─────────────────────────────────────────
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      authMethod: user.authMethod,
      preferences: user.preferences,
      streak: { current: user.currentStreak, longest: user.longestStreak },
      totalEntries: user.totalEntries,
      memberSince: user.createdAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch profile.' });
  }
});

// ─────────────────────────────────────────
// PATCH /api/user/preferences
// Update user preferences
// Body: any fields from preferences object
// ─────────────────────────────────────────
router.patch('/preferences', async (req, res) => {
  try {
    const allowed = ['defaultMood', 'morningTime', 'eveningTime', 'nightTime', 'ambientSound', 'moodThemeEnabled', 'reminderEnabled'];
    const updates = {};

    allowed.forEach(key => {
      if (req.body[key] !== undefined) {
        updates[`preferences.${key}`] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true }
    );

    res.json({ message: 'Preferences updated!', preferences: user.preferences });

  } catch (err) {
    res.status(500).json({ error: 'Could not update preferences.' });
  }
});

// ─────────────────────────────────────────
// PATCH /api/user/name
// Update display name
// ─────────────────────────────────────────
router.patch('/name', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length < 1) {
      return res.status(400).json({ error: 'Name cannot be empty.' });
    }
    await User.findByIdAndUpdate(req.user._id, { name: name.trim() });
    res.json({ message: 'Name updated!' });
  } catch (err) {
    res.status(500).json({ error: 'Could not update name.' });
  }
});

// ─────────────────────────────────────────
// DELETE /api/user/account
// Delete account and all data permanently
// ─────────────────────────────────────────
router.delete('/account', async (req, res) => {
  try {
    const userId = req.user._id;
    await Entry.deleteMany({ user: userId });
    await User.findByIdAndDelete(userId);
    res.json({ message: 'Account and all data deleted permanently.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete account.' });
  }
});

module.exports = router;
