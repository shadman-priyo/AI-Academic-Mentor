/**
 * Quiz Routes — /api/quiz
 * CSE4104-7C-T05 | AI Academic Mentor
 *
 * GET    /api/quiz       — list user's quiz results
 * POST   /api/quiz       — save a quiz result
 * GET    /api/quiz/:id   — get single result
 * DELETE /api/quiz/:id   — delete a result
 *
 * FIX: same bug as auth.js — old try/catch(dbErr) silently faked success
 * via an in-memory object on ANY Mongoose error. Now we check the real
 * connection state and only fall back when Mongo is truly disconnected.
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { isDbConnected } = require('../middleware/db');

const inMemoryResults = {};

// ── GET /api/quiz ─────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    if (isDbConnected()) {
      const QuizResult = require('../models/QuizResult');
      const results = await QuizResult.find({ user: req.user.id }).sort({ createdAt: -1 });
      return res.json({ results, count: results.length });
    }
    const results = inMemoryResults[req.user.id] || [];
    res.json({ results, count: results.length, demoMode: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/quiz ────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { topic, score, numQuestions, correct, difficulty, type, answers } = req.body;
    if (!topic || score === undefined || !numQuestions) {
      return res.status(400).json({ error: 'topic, score, and numQuestions are required.' });
    }

    if (isDbConnected()) {
      const QuizResult = require('../models/QuizResult');
      const result = await QuizResult.create({
        user: req.user.id,
        topic,
        score,
        numQuestions,
        correct: correct || 0,
        difficulty: difficulty || 'medium',
        type: type || 'mcq',
        answers: answers || []
      });
      return res.status(201).json({ result, demoMode: false });
    }

    console.warn('⚠️  /api/quiz POST running in DEMO MODE — MongoDB not connected.');
    if (!inMemoryResults[req.user.id]) inMemoryResults[req.user.id] = [];
    const result = {
      id: Date.now().toString(),
      topic, score, numQuestions, correct,
      difficulty: difficulty || 'medium',
      type: type || 'mcq',
      date: new Date().toISOString()
    };
    inMemoryResults[req.user.id].unshift(result);
    return res.status(201).json({ result, demoMode: true });
  } catch (err) {
    console.error('Quiz save error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/quiz/:id ───────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    if (isDbConnected()) {
      const QuizResult = require('../models/QuizResult');
      const result = await QuizResult.findOne({ _id: req.params.id, user: req.user.id });
      if (!result) return res.status(404).json({ error: 'Result not found.' });
      return res.json({ result });
    }
    const results = inMemoryResults[req.user.id] || [];
    const result = results.find(r => r.id === req.params.id);
    if (!result) return res.status(404).json({ error: 'Result not found.' });
    res.json({ result, demoMode: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/quiz/:id ────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    if (isDbConnected()) {
      const QuizResult = require('../models/QuizResult');
      const deleted = await QuizResult.findOneAndDelete({ _id: req.params.id, user: req.user.id });
      if (!deleted) return res.status(404).json({ error: 'Result not found.' });
      return res.json({ message: 'Result deleted.' });
    }
    if (inMemoryResults[req.user.id]) {
      inMemoryResults[req.user.id] = inMemoryResults[req.user.id].filter(r => r.id !== req.params.id);
    }
    res.json({ message: 'Result deleted (demo mode).', demoMode: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
