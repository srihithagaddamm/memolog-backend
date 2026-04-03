// routes/mood.js — Mood history, streaks, monthly stats
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const MoodHistory = require('../models/MoodHistory');
const User = require('../models/User');

router.use(protect);

// ─────────────────────────────────────────
// GET /api/mood/stats
// Overall mood stats for the user
// ─────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Count by mood all time
    const moodCounts = await MoodHistory.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: '$mood', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Most frequent mood
    const topMood = moodCounts.length > 0 ? moodCounts[0]._id : null;

    res.json({
      streak: {
        current: user.currentStreak,
        longest: user.longestStreak,
        lastWritten: user.lastWrittenDate
      },
      totalEntries: user.totalEntries,
      moodBreakdown: moodCounts,
      topMood
    });

  } catch (err) {
    res.status(500).json({ error: 'Could not fetch mood stats.' });
  }
});

// ─────────────────────────────────────────
// GET /api/mood/monthly?month=2026-03
// Mood data for a specific month (for calendar heatmap)
// ─────────────────────────────────────────
router.get('/monthly', async (req, res) => {
  try {
    const { month } = req.query;
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    const history = await MoodHistory.find({
      user: req.user._id,
      month: targetMonth
    }).select('dateString mood aiSentimentScore').sort({ dateString: 1 });

    // Transform into { "2026-03-01": "happy", "2026-03-02": "calm", ... }
    const calendar = {};
    history.forEach(h => { calendar[h.dateString] = h.mood; });

    // Count per mood this month
    const monthlyBreakdown = {};
    history.forEach(h => {
      monthlyBreakdown[h.mood] = (monthlyBreakdown[h.mood] || 0) + 1;
    });

    res.json({ month: targetMonth, calendar, breakdown: monthlyBreakdown, total: history.length });

  } catch (err) {
    res.status(500).json({ error: 'Could not fetch monthly mood data.' });
  }
});

// ─────────────────────────────────────────
// GET /api/mood/weekly
// Last 7 days mood data
// ─────────────────────────────────────────
router.get('/weekly', async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const history = await MoodHistory.find({
      user: req.user._id,
      date: { $gte: sevenDaysAgo }
    }).select('dateString mood').sort({ date: 1 });

    res.json({ week: history });

  } catch (err) {
    res.status(500).json({ error: 'Could not fetch weekly mood data.' });
  }
});

module.exports = router;
