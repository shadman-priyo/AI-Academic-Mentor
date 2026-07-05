/**
 * Admin Routes — /api/admin
 * CSE4104-7C-T05 | AI Academic Mentor
 *
 * GET    /api/admin/stats         — platform statistics
 * GET    /api/admin/users         — list all users
 * GET    /api/admin/users/:id     — get single user
 * PUT    /api/admin/users/:id     — update user (role, status)
 * DELETE /api/admin/users/:id     — delete user
 */

const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');

// All admin routes require auth + admin role
router.use(auth, adminOnly);

// ── GET /api/admin/stats ──────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const User       = require('../models/User');
    const QuizResult = require('../models/QuizResult');
    const StudyPlan  = require('../models/StudyPlan');
    const Note       = require('../models/Note');

    const [totalUsers, totalQuizzes, totalPlans, totalNotes] = await Promise.all([
      User.countDocuments(),
      QuizResult.countDocuments(),
      StudyPlan.countDocuments(),
      Note.countDocuments()
    ]);

    const avgScoreResult = await QuizResult.aggregate([
      { $group: { _id: null, avg: { $avg: '$score' } } }
    ]);

    res.json({
      platform: 'AI Academic Mentor',
      team: 'CSE4104-7C-T05',
      stats: {
        totalUsers,
        totalQuizzes,
        totalPlans,
        totalNotes,
        avgQuizScore: avgScoreResult[0]?.avg ? Math.round(avgScoreResult[0].avg) : 0
      },
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/users ──────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const User = require('../models/User');
    const { page = 1, limit = 20, role } = req.query;
    const filter = role ? { role } : {};
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    const total = await User.countDocuments(filter);
    res.json({ users, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/users/:id ──────────────────────────────────
router.get('/users/:id', async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/admin/users/:id/activity ───────────────────────────
// FIX: admin.html used to read DataStore.getForUser(otherUserId, ...) which
// reads from the ADMIN'S OWN BROWSER localStorage — it could never contain
// another user's data (localStorage is per-browser, not shared). Every
// "user activity" number the admin panel showed for other users was
// silently always 0. This is the real thing, straight from MongoDB.
router.get('/users/:id/activity', async (req, res) => {
  try {
    const QuizResult = require('../models/QuizResult');
    const StudyPlan = require('../models/StudyPlan');
    const Note = require('../models/Note');

    const [quizzes, plans, notes] = await Promise.all([
      QuizResult.find({ user: req.params.id }),
      StudyPlan.find({ user: req.params.id }),
      Note.find({ user: req.params.id })
    ]);
    const chats = notes.filter(n => n.subject === 'chat');
    const avgScore = quizzes.length ? Math.round(quizzes.reduce((s, q) => s + q.score, 0) / quizzes.length) : 0;

    res.json({
      quizzes: quizzes.length,
      plans: plans.length,
      chats: chats.length,
      notes: notes.length - chats.length,
      avgScore
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/admin/users/:id ──────────────────────────────────
router.put('/users/:id', async (req, res) => {
  try {
    const { role, isActive } = req.body;
    const updates = {};
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;

    const User = require('../models/User');
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'User updated.', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/admin/users/:id ───────────────────────────────
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account.' });
    }
    const User = require('../models/User');
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
