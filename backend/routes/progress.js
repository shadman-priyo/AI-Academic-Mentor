/**
 * Progress Routes — /api/progress
 * CSE4104-7C-T05 | AI Academic Mentor
 *
 * GET /api/progress        — aggregated progress overview
 * GET /api/progress/stats  — detailed stats
 */

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    let quizStats = { total: 0, avgScore: 0, topics: [] };
    let planStats = { total: 0, active: 0 };
    let noteStats = { total: 0 };

    try {
      const QuizResult = require('../models/QuizResult');
      const StudyPlan  = require('../models/StudyPlan');
      const Note       = require('../models/Note');

      const quizzes = await QuizResult.find({ user: req.user.id });
      const plans   = await StudyPlan.find({ user: req.user.id });
      const notes   = await Note.find({ user: req.user.id });

      quizStats = {
        total: quizzes.length,
        avgScore: quizzes.length
          ? Math.round(quizzes.reduce((s, q) => s + q.score, 0) / quizzes.length)
          : 0,
        topics: [...new Set(quizzes.map(q => q.topic))]
      };
      planStats = { total: plans.length, active: plans.filter(p => p.isActive).length };
      noteStats = { total: notes.length };
    } catch { /* no DB — return zeros */ }

    res.json({
      userId: req.user.id,
      quiz: quizStats,
      plans: planStats,
      notes: noteStats,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', auth, async (req, res) => {
  try {
    const QuizResult = require('../models/QuizResult');
    const results = await QuizResult.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(10);
    const scores  = results.map(r => ({ topic: r.topic, score: r.score, date: r.createdAt }));
    res.json({ recentScores: scores, count: results.length });
  } catch {
    res.json({ recentScores: [], count: 0, message: 'Database not connected.' });
  }
});

module.exports = router;
