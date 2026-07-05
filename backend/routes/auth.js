/**
 * Auth Routes — /api/auth
 * CSE4104-7C-T05 | AI Academic Mentor
 *
 * POST /api/auth/register  — create account
 * POST /api/auth/login     — login, receive JWT
 * GET  /api/auth/me        — get own profile (protected)
 * PUT  /api/auth/profile   — update profile (protected)
 * POST /api/auth/logout    — logout (client-side token deletion)
 *
 * ---------------------------------------------------------------
 * FIX LOG (read this):
 * 1. OLD CODE: every DB call was wrapped in try{...}catch(dbErr){ fall back
 *    to in-memory array }. That swallowed real Mongoose errors (bad
 *    connection, validation failure, whatever) and silently returned a fake
 *    "success" backed by a JS array that lives only in RAM and resets on
 *    every server restart. That is why your data never showed up in Atlas —
 *    the app was lying to you about where it saved.
 * 2. NEW CODE: we check the actual Mongo connection state
 *    (mongoose.connection.readyState). If Mongo is connected, we use it and
 *    let real errors surface as 500s with the actual message. In-memory mode
 *    is ONLY used when Mongo is truly not connected, and the response is
 *    tagged demoMode: true so the frontend/you can tell immediately.
 * 3. Admin signup code was only ever checked in the BROWSER
 *    (register.html JS). Anyone with devtools could read the code and grant
 *    themselves admin, or just call the API directly with role:"admin" and
 *    skip the check entirely — the OLD backend never validated it. NEW CODE
 *    validates the admin code server-side and ignores whatever role the
 *    client claims unless the code matches.
 * ---------------------------------------------------------------
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { auth } = require('../middleware/auth');
const { isDbConnected } = require('../middleware/db');

// In-memory fallback — ONLY used when MongoDB is genuinely disconnected.
const inMemoryUsers = [];

const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE || 'NUBTK-ADMIN-2026';

function signToken(user) {
  return jwt.sign(
    { id: user._id || user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'dev_secret_change_in_production',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ── POST /api/auth/register ──────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, studentId, department, role, adminAccessCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    // Server-side admin gate. The client can ask for role:"admin" but it
    // ONLY sticks if the correct code comes with it. Never trust the client.
    let finalRole = 'student';
    if (role === 'admin') {
      if (!adminAccessCode || adminAccessCode !== ADMIN_ACCESS_CODE) {
        return res.status(403).json({ error: 'Invalid admin access code.' });
      }
      finalRole = 'admin';
    }

    if (isDbConnected()) {
      const User = require('../models/User');
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) return res.status(409).json({ error: 'Email already registered.' });

      const user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        studentId: studentId || null,
        department: department || 'CSE',
        role: finalRole
      });

      const token = signToken(user);
      return res.status(201).json({
        message: 'Registration successful.',
        token,
        user,
        demoMode: false
      });
    }

    // ── Demo mode: Mongo is not connected ──
    console.warn('⚠️  /api/auth/register running in DEMO MODE — MongoDB is not connected. Nothing is being persisted.');
    if (inMemoryUsers.find(u => u.email === email.toLowerCase())) {
      return res.status(409).json({ error: 'Email already registered.' });
    }
    const hash = await bcrypt.hash(password, 12);
    const user = {
      id: 'u_' + Date.now(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hash,
      studentId: studentId || null,
      department: department || 'CSE',
      role: finalRole,
      isActive: true,
      createdAt: new Date()
    };
    inMemoryUsers.push(user);
    const { password: _, ...safe } = user;
    return res.status(201).json({
      message: 'Registration successful, but MongoDB is NOT connected — this account will disappear on server restart.',
      token: signToken(safe),
      user: safe,
      demoMode: true
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email already registered.' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (isDbConnected()) {
      const User = require('../models/User');
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      if (!user) return res.status(401).json({ error: 'Invalid email or password.' });
      if (!user.isActive) return res.status(403).json({ error: 'Account is disabled. Contact admin.' });

      const match = await user.comparePassword(password);
      if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

      user.lastLogin = new Date();
      await user.save();

      const token = signToken(user);
      return res.json({ message: 'Login successful.', token, user, demoMode: false });
    }

    console.warn('⚠️  /api/auth/login running in DEMO MODE — MongoDB is not connected.');
    const user = inMemoryUsers.find(u => u.email === email.toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const { password: _, ...safe } = user;
    return res.json({ message: 'Login successful (demo mode — not from MongoDB).', token: signToken(safe), user: safe, demoMode: true });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    if (isDbConnected()) {
      const User = require('../models/User');
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      return res.json({ user });
    }
    const user = inMemoryUsers.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const { password: _, ...safe } = user;
    return res.json({ user: safe, demoMode: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/auth/profile ────────────────────────────────────
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, studentId, department } = req.body;
    const updates = {};
    if (name) updates.name = name.trim();
    if (studentId) updates.studentId = studentId.trim();
    if (department) updates.department = department.trim();

    if (isDbConnected()) {
      const User = require('../models/User');
      const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });
      if (!user) return res.status(404).json({ error: 'User not found.' });
      return res.json({ message: 'Profile updated.', user });
    }

    const idx = inMemoryUsers.findIndex(u => u.id === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'User not found.' });
    Object.assign(inMemoryUsers[idx], updates);
    const { password: _, ...safe } = inMemoryUsers[idx];
    return res.json({ message: 'Profile updated (demo mode).', user: safe, demoMode: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/logout ────────────────────────────────────
router.post('/logout', auth, (req, res) => {
  res.json({ message: 'Logged out successfully. Please delete your token on the client side.' });
});

module.exports = router;
