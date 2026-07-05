/**
 * Notes Routes — /api/notes
 * CSE4104-7C-T05 | AI Academic Mentor
 *
 * GET    /api/notes       — list user's notes
 * POST   /api/notes       — create note
 * GET    /api/notes/:id   — get single note
 * PUT    /api/notes/:id   — update note
 * DELETE /api/notes/:id   — delete note
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const Note = require('../models/Note');
    const notes = await Note.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ notes, count: notes.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { title, originalText, subject, tags } = req.body;
    if (!title || !originalText) return res.status(400).json({ error: 'title and originalText are required.' });
    const Note = require('../models/Note');
    const note = await Note.create({ user: req.user.id, title, originalText, subject, tags: tags || [] });
    res.status(201).json({ note });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const Note = require('../models/Note');
    const note = await Note.findOne({ _id: req.params.id, user: req.user.id });
    if (!note) return res.status(404).json({ error: 'Note not found.' });
    res.json({ note });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const Note = require('../models/Note');
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!note) return res.status(404).json({ error: 'Note not found.' });
    res.json({ note });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const Note = require('../models/Note');
    const deleted = await Note.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!deleted) return res.status(404).json({ error: 'Note not found.' });
    res.json({ message: 'Note deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
