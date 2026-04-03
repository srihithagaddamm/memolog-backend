// routes/entries.js — Create, read, update, delete diary entries
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Entry = require('../models/Entry');
const MoodHistory = require('../models/MoodHistory');
const User = require('../models/User');

// All entry routes require login
router.use(protect);

// Helper: format date string YYYY-MM-DD
const toDateString = (date) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

// Helper: update user streak
const updateStreak = async (userId, dateString) => {
  const user = await User.findById(userId);
  const today = toDateString(new Date());
  const yesterday = toDateString(new Date(Date.now() - 86400000));
  const last = user.lastWrittenDate ? toDateString(user.lastWrittenDate) : null;

  if (last === today) return; // Already written today
  if (last === yesterday) {
    user.currentStreak += 1;
  } else {
    user.currentStreak = 1; // Streak broken, reset
  }
  if (user.currentStreak > user.longestStreak) {
    user.longestStreak = user.currentStreak;
  }
  user.lastWrittenDate = new Date();
  user.totalEntries += 1;
  await user.save();
};

// ─────────────────────────────────────────
// POST /api/entries
// Create or update today's entry
// Body: { date, title, mood, blocks }
// ─────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { date, title, mood, blocks } = req.body;

    if (!mood || !blocks) {
      return res.status(400).json({ error: 'Mood and blocks are required.' });
    }

    const entryDate = new Date(date || Date.now());
    const dateString = toDateString(entryDate);

    // Upsert: create or update entry for this date
    let entry = await Entry.findOne({ user: req.user._id, dateString });

    if (entry) {
      // Update existing
      entry.title = title || entry.title;
      entry.mood = mood;
      entry.blocks = blocks;
      await entry.save();
    } else {
      // Create new
      entry = await Entry.create({
        user: req.user._id,
        date: entryDate,
        dateString,
        title: title || '',
        mood,
        blocks
      });

      // Update streak only on new entry
      await updateStreak(req.user._id, dateString);
    }

    // Save to mood history
    await MoodHistory.findOneAndUpdate(
      { user: req.user._id, dateString },
      { user: req.user._id, date: entryDate, dateString, month: dateString.slice(0, 7), mood, entry: entry._id },
      { upsert: true, new: true }
    );

    res.status(201).json({ message: 'Entry saved!', entry });

  } catch (err) {
    console.error('Create entry error:', err.message);
    res.status(500).json({ error: 'Could not save entry.' });
  }
});

// ─────────────────────────────────────────
// GET /api/entries
// Get all entries for the logged-in user
// Query params: ?page=1&limit=10&mood=happy
// ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, mood, hasPhoto } = req.query;
    const filter = { user: req.user._id };

    if (mood) filter.mood = mood;
    if (hasPhoto === 'true') filter.hasPhotos = true;

    const entries = await Entry.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select('-blocks.photos.publicId'); // Don't expose cloudinary IDs

    const total = await Entry.countDocuments(filter);

    res.json({
      entries,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    res.status(500).json({ error: 'Could not fetch entries.' });
  }
});

// ─────────────────────────────────────────
// GET /api/entries/today
// Get today's entry if it exists
// ─────────────────────────────────────────
router.get('/today', async (req, res) => {
  try {
    const dateString = toDateString(new Date());
    const entry = await Entry.findOne({ user: req.user._id, dateString });
    res.json({ entry: entry || null });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch today\'s entry.' });
  }
});

// ─────────────────────────────────────────
// GET /api/entries/:id
// Get a single entry by ID
// ─────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const entry = await Entry.findOne({ _id: req.params.id, user: req.user._id });
    if (!entry) return res.status(404).json({ error: 'Entry not found.' });
    res.json({ entry });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch entry.' });
  }
});

// ─────────────────────────────────────────
// PATCH /api/entries/:id/release
// "Let it go" feature — marks entry as released / clears text
// ─────────────────────────────────────────
router.patch('/:id/release', async (req, res) => {
  try {
    const entry = await Entry.findOne({ _id: req.params.id, user: req.user._id });
    if (!entry) return res.status(404).json({ error: 'Entry not found.' });

    // Clear all text blocks but keep mood/date record
    entry.blocks.forEach(block => { block.text = ''; block.wordCount = 0; });
    entry.totalWordCount = 0;
    entry.isReleased = true;
    await entry.save();

    res.json({ message: 'Entry released. Let it go. 🕊', entry });
  } catch (err) {
    res.status(500).json({ error: 'Could not release entry.' });
  }
});

// ─────────────────────────────────────────
// DELETE /api/entries/:id
// Delete an entry permanently
// ─────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const entry = await Entry.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!entry) return res.status(404).json({ error: 'Entry not found.' });

    // Also remove from mood history
    await MoodHistory.deleteOne({ entry: req.params.id });

    res.json({ message: 'Entry deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete entry.' });
  }
});

module.exports = router;
