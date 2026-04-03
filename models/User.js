// models/User.js — Everything stored about a user
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({

  // ── BASIC INFO ──
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 50
  },

  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },

  password: {
    type: String,
    minlength: 6,
    select: false  // Never returned in queries by default
  },

  // ── GOOGLE AUTH ──
  googleId: {
    type: String,
    unique: true,
    sparse: true  // Allows null for email users
  },

  authMethod: {
    type: String,
    enum: ['email', 'google'],
    default: 'email'
  },

  // ── PIN LOCK (hashed) ──
  pin: {
    type: String,
    select: false
  },

  // ── PREFERENCES ──
  preferences: {
    defaultMood:      { type: String, default: 'happy' },
    morningTime:      { type: String, default: '08:00' },
    eveningTime:      { type: String, default: '18:00' },
    nightTime:        { type: String, default: '22:00' },
    ambientSound:     { type: String, default: 'none' },
    moodThemeEnabled: { type: Boolean, default: true },
    reminderEnabled:  { type: Boolean, default: true }
  },

  // ── STREAK TRACKING ──
  currentStreak:  { type: Number, default: 0 },
  longestStreak:  { type: Number, default: 0 },
  lastWrittenDate: { type: Date, default: null },
  totalEntries:   { type: Number, default: 0 },

  // ── ACCOUNT ──
  isActive:   { type: Boolean, default: true },
  createdAt:  { type: Date, default: Date.now }

}, { timestamps: true });

// ── HASH PASSWORD AND PIN BEFORE SAVING ──
userSchema.pre('save', async function(next) {
  try {
    // Hash password if modified
    if (this.isModified('password') && this.password) {
      this.password = await bcrypt.hash(this.password, 12);
    }
    
    // Hash PIN if modified
    if (this.isModified('pin') && this.pin) {
      this.pin = await bcrypt.hash(this.pin, 10);
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// ── METHOD: check password ──
userSchema.methods.checkPassword = async function(inputPassword) {
  return await bcrypt.compare(inputPassword, this.password);
};

// ── METHOD: check pin ──
userSchema.methods.checkPin = async function(inputPin) {
  return await bcrypt.compare(inputPin, this.pin);
};

module.exports = mongoose.model('User', userSchema);
