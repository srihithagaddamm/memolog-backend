// ─────────────────────────────────────────
// MEMOLOG — SERVER ENTRY POINT
// ─────────────────────────────────────────

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ── MIDDLEWARE ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS — allow frontend to talk to backend
app.use(cors())

// Rate limiting — prevent spam/abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please slow down.' }
});
app.use('/api/', limiter);

// Stricter limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please wait.' }
});
app.use('/api/auth/', authLimiter);

// ── DATABASE CONNECTION ──
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

// ── ROUTES ──
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/entries', require('./routes/entries'));
app.use('/api/mood',    require('./routes/mood'));
app.use('/api/photos',  require('./routes/photos'));
app.use('/api/ai',      require('./routes/ai'));
app.use('/api/user',    require('./routes/user'));

// ── HEALTH CHECK ──
app.get('/', (req, res) => {
  res.json({
    status: 'MemoLog backend is running',
    version: '1.0.0',
    time: new Date().toISOString()
  });
});

// ── GLOBAL ERROR HANDLER ──
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong on our end.'
  });
});

// ── START SERVER ──
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 MemoLog server running on port ${PORT}`);
});
