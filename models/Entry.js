// models/Entry.js — Everything stored about one diary entry
const mongoose = require('mongoose');

// Sub-schema for each time block inside an entry
const timeBlockSchema = new mongoose.Schema({
  block: {
    type: String,
    enum: ['morning', 'evening', 'night'],
    required: true
  },
  text:    { type: String, default: '' },
  skipped: { type: Boolean, default: false },
  wordCount: { type: Number, default: 0 },

  // Font and colour preferences the user picked while writing
  fontFamily: { type: String, default: 'DM Sans' },
  fontSize:   { type: String, default: '1rem' },
  textColor:  { type: String, default: '#2C2C2A' },

  // Photos attached to this specific block
  photos: [{
    url:       { type: String },
    publicId:  { type: String }, // Cloudinary ID for deletion
    caption:   { type: String, default: '' }
  }],

  writtenAt: { type: Date }
}, { _id: false });

// AI analysis sub-schema
const aiAnalysisSchema = new mongoose.Schema({
  sentimentScore: { type: Number, min: -1, max: 1 }, // -1 very sad, +1 very happy
  dominantEmotion: { type: String },
  reflection:      { type: String }, // AI generated reflection text
  suggestions:     [{ type: String }], // Gentle suggestions
  analyzedAt:      { type: Date }
}, { _id: false });

const entrySchema = new mongoose.Schema({

  // ── OWNER ──
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ── DATE ──
  date: {
    type: Date,
    required: true,
    index: true
  },

  // Stored as YYYY-MM-DD string for easy daily lookups
  dateString: {
    type: String,
    required: true,
    index: true
  },

  // ── TITLE ──
  title: {
    type: String,
    default: '',
    maxlength: 120
  },

  // ── MOOD ──
  mood: {
    type: String,
    enum: ['happy', 'calm', 'sad', 'overwhelmed', 'grateful'],
    required: true
  },

  // ── TIME BLOCKS ──
  blocks: [timeBlockSchema],

  // ── AI ANALYSIS ──
  aiAnalysis: aiAnalysisSchema,

  // ── STATS ──
  totalWordCount: { type: Number, default: 0 },
  hasPhotos:      { type: Boolean, default: false },

  // ── RELEASE (let it go feature) ──
  isReleased: { type: Boolean, default: false },

}, { timestamps: true });

// ── COMPOUND INDEX: one entry per user per day ──
entrySchema.index({ user: 1, dateString: 1 }, { unique: true });

// ── AUTO-CALCULATE total word count before saving ──
entrySchema.pre('save', function(next) {
  let total = 0;
  let hasPhotos = false;
  this.blocks.forEach(block => {
    block.wordCount = block.text
      ? block.text.trim().split(/\s+/).filter(w => w.length > 0).length
      : 0;
    total += block.wordCount;
    if (block.photos && block.photos.length > 0) hasPhotos = true;
  });
  this.totalWordCount = total;
  this.hasPhotos = hasPhotos;
  next();
});

module.exports = mongoose.model('Entry', entrySchema);
