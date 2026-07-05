/**
 * AI Academic Mentor — Express Backend Master
 * CSE4104-7C-T05 | NUBTK 2026
 * ============================================
 * Week 06: Backend Development & Database Implementation
 * Fully configured to communicate with your Frontend Live Server on Port 5500.
 */

// ============ 🚀 BULLETPROOF DNS FIX FOR MONGODB ATLAS ============
// This forces Node.js core network registry to bypass faulty system/ISP resolvers
const dns = require('node:dns');
dns.setServers(['1.1.1.1', '1.0.0.1', '8.8.8.8', '8.8.4.4']); 

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

// ============ MIDDLEWARE (FIXED FOR PORT 5500 LIVE SERVER) ============
// Bypasses Helmet's strict cross-origin block to allow browser script requests safely
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false
}));

app.use(morgan('combined'));

// Dynamically accepts your frontend port (127.0.0.1:5500) and authorizes JWT tokens securely
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// General rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// AI-specific rate limiting (optimized for flawless workspace testing)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 60, 
  message: { error: 'AI rate limit exceeded. Please wait a moment.' }
});

// ============ DATABASE CONNECTION ============
const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.log('⚠  No MONGODB_URI set — running in demo mode (in-memory)');
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ MongoDB connected successfully');
    
    // ============ GEMINI API KEY CHECKER ============
    console.log(
      process.env.GEMINI_API_KEY 
        ? '🤖 Gemini API Key loaded: YES (Success) 🎉' 
        : '❌ Gemini API Key loaded: NO (Failed! Please check your .env file)'
    );
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

connectDB();

// ============ ROUTES ============
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/ai',     require('./routes/ai'));
app.use('/api/quiz',   require('./routes/quiz'));
app.use('/api/plan',   require('./routes/plan'));
app.use('/api/summary', require('./routes/summary'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/admin',  require('./routes/admin'));
app.use('/api/notes',  require('./routes/notes'));

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    project: 'AI Academic Mentor',
    team: 'CSE4104-7C-T05',
    university: 'NUBTK',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    endpoints: {
      auth: ['/api/auth/register', '/api/auth/login', '/api/auth/me', '/api/auth/logout'],
      ai: ['/api/ai/chat', '/api/ai/quiz', '/api/ai/summarize', '/api/ai/plan'],
      quiz: ['/api/quiz', '/api/quiz/:id'],
      plan: ['/api/plan', '/api/plan/:id'],
      summary: ['/api/summary', '/api/summary/:id'],
      progress: ['/api/progress', '/api/progress/stats'],
      notes: ['/api/notes', '/api/notes/:id'],
      admin: ['/api/admin/stats', '/api/admin/users', '/api/admin/users/:id']
    }
  });
});

app.get('/', (req, res) => {
  res.json({
    message: 'AI Academic Mentor API — CSE4104-7C-T05 | NUBTK 2026',
    health: '/api/health',
    week: 'Week 06 — Backend Development & Database Implementation'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// ============ START SERVER ============
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║    AI Academic Mentor — API Server       ║
  ║    CSE4104-7C-T05 | NUBTK 2026          ║
  ║    Week 06: Backend & Database           ║
  ╠══════════════════════════════════════════╣
  ║  🚀 Port    : ${PORT}                       ║
  ║  🌍 Mode    : ${(process.env.NODE_ENV || 'development').padEnd(24)} ║
  ║  📡 Health  : /api/health               ║
  ╚══════════════════════════════════════════╝
  `);
});

module.exports = app;
