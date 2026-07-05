/**
 * Summary Routes — /api/summary
 * CSE4104-7C-T05 | AI Academic Mentor
 * FIX: same silent-fallback bug as auth.js, resolved the same way.
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { isDbConnected } = require('../middleware/db');

const inMemorySummaries = {};

router.get('/', auth, async (req, res) => {
  try {
    if (isDbConnected()) {
      const Note = require('../models/Note');
      const notes = await Note.find({ user: req.user.id }).sort({ createdAt: -1 }).select('-originalText');
      return res.json({ summaries: notes, count: notes.length });
    }
    const summaries = inMemorySummaries[req.user.id] || [];
    res.json({ summaries, count: summaries.length, demoMode: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, originalText, summary, subject, style, tags } = req.body;
    if (!originalText) return res.status(400).json({ error: 'originalText is required.' });

    if (isDbConnected()) {
      const Note = require('../models/Note');
      const note = await Note.create({
        user: req.user.id,
        title: title || 'Untitled Note',
        originalText,
        summary: summary || null,
        subject: subject || null,
        style: style || 'concise',
        tags: tags || []
      });
      return res.status(201).json({ summary: note, demoMode: false });
    }

    console.warn('⚠️  /api/summary POST running in DEMO MODE — MongoDB not connected.');
    if (!inMemorySummaries[req.user.id]) inMemorySummaries[req.user.id] = [];
    const s = { id: Date.now().toString(), title, originalText, summary, subject, style, createdAt: new Date().toISOString() };
    inMemorySummaries[req.user.id].unshift(s);
    return res.status(201).json({ summary: s, demoMode: true });
  } catch (err) {
    console.error('Summary save error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    if (isDbConnected()) {
      const Note = require('../models/Note');
      const note = await Note.findOne({ _id: req.params.id, user: req.user.id });
      if (!note) return res.status(404).json({ error: 'Summary not found.' });
      return res.json({ summary: note });
    }
    const summaries = inMemorySummaries[req.user.id] || [];
    const s = summaries.find(x => x.id === req.params.id);
    if (!s) return res.status(404).json({ error: 'Summary not found.' });
    res.json({ summary: s, demoMode: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (isDbConnected()) {
      const Note = require('../models/Note');
      const deleted = await Note.findOneAndDelete({ _id: req.params.id, user: req.user.id });
      if (!deleted) return res.status(404).json({ error: 'Summary not found.' });
      return res.json({ message: 'Summary deleted.' });
    }
    if (inMemorySummaries[req.user.id]) {
      inMemorySummaries[req.user.id] = inMemorySummaries[req.user.id].filter(s => s.id !== req.params.id);
    }
    res.json({ message: 'Summary deleted (demo mode).', demoMode: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
