// models/MoodHistory.js — Daily mood log for tracking & analytics
const mongoose = require('mongoose');

const moodHistorySchema = new mongoose.Schema({

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  date:       { type: Date, required: true },
  dateString: { type: String, required: true }, // "2026-03-26"
  month:      { type: String, required: true }, // "2026-03"

  mood: {
    type: String,
    enum: ['happy', 'calm', 'sad', 'overwhelmed', 'grateful'],
    required: true
  },

  // Linked to the diary entry for that day
  entry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Entry'
  },

  // AI-detected sentiment — may differ from user-selected mood
  aiSentimentScore: { type: Number, min: -1, max: 1 },

}, { timestamps: true });

// One mood log per user per day
moodHistorySchema.index({ user: 1, dateString: 1 }, { unique: true });

module.exports = mongoose.model('MoodHistory', moodHistorySchema);
