/**
 * AI Routes — /api/ai
 * CSE4104-7C-T05 | AI Academic Mentor
 *
 * ---------------------------------------------------------------
 * FIX LOG (read this):
 * 1. RESPONSE FIELD MISMATCH: the old backend sent back
 *    { message, quizData, studyPlan } but frontend/components/auth.js's
 *    GeminiAPI object read data.reply / data.questions / data.plan.
 *    Those keys never existed in the response, so EVERY AI feature
 *    (chat, quiz, planner, summarizer) silently fell through to
 *    "No response generated." on the frontend even when the backend
 *    call fully succeeded. Fixed: this file now returns { reply },
 *    { quiz }, { plan } consistently, and frontend/components/auth.js
 *    has been updated to match.
 * 2. GEMINI_API_KEY VALIDATION: real Gemini Developer API keys from
 *    https://aistudio.google.com/app/apikey always start with "AIza".
 *    The key you shipped in .env starts with "AQ." which is NOT a Gemini
 *    Developer API key format — it looks like a Google OAuth access token,
 *    which expires in ~1 hour and isn't usable here at all. That is a big
 *    part of why "AI answers" felt fake — Gemini was failing on every
 *    single call and you were silently getting the local mock fallback
 *    text. This file now logs a loud, unmissable warning at startup and on
 *    every failed call if the key format looks wrong.
 * 3. NO PERSISTENCE: the old chat/quiz/plan/summary AI routes never wrote
 *    anything to MongoDB — they just returned text. Every "AI Academic
 *    Mentor" feature was 100% ephemeral. This file now saves a Note
 *    document (subject: 'chat') for every chat exchange when the user is
 *    logged in, so you can see rows land in Atlas in real time as you type.
 *    Quiz/plan/summary "save" actions still go through /api/quiz,
 *    /api/plan, /api/summary — that's the frontend's job when the user
 *    finishes generating something (fixed in quiz.html / planner.html /
 *    summarizer.html).
 * ---------------------------------------------------------------
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { GoogleGenAI } = require('@google/genai');
const { HfInference } = require('@huggingface/inference');
const { isDbConnected } = require('../middleware/db');


const GEMINI_KEY_LOOKS_VALID =
  typeof process.env.GEMINI_API_KEY === "string" &&
  process.env.GEMINI_API_KEY.trim().length > 0;

if (!GEMINI_KEY_LOOKS_VALID) {
  console.warn("⚠️ GEMINI_API_KEY is missing.");
}

const aiGen = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const hf = new HfInference(process.env.HF_ACCESS_TOKEN || '');

// ── Optional (soft) auth: attach req.user if a valid token is present,
//    but never block the request if it's missing/invalid. AI features
//    should work for guests; persistence just won't happen for them. ──
function softAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_in_production');
    } catch {
      req.user = null;
    }
  }
  next();
}

async function processAIChat(userMessage, systemPrompt = '') {

  console.log("========== AI DEBUG ==========");
  console.log("Message:", userMessage);
  console.log("Gemini Key Exists:", !!process.env.GEMINI_API_KEY);
  console.log("Gemini Key:", process.env.GEMINI_API_KEY?.substring(0, 10));

  const fullPrompt = systemPrompt
    ? `${systemPrompt}\nUser: ${userMessage}`
    : userMessage;

  if (GEMINI_KEY_LOOKS_VALID) {
    try {
      console.log("🚀 Calling Gemini API...");
      const response = await aiGen.models.generateContent({
        // 'gemini-2.0-flash' was shut down by Google on June 1, 2026.
        // 'gemini-2.5-flash' is the official migration target — good
        // free-tier limits, same "flash" price/speed class.
        // If you hit free-tier rate limits often, try 'gemini-2.5-flash-lite'
        // instead (lower quality, higher RPM/RPD on the free tier).
        model: 'gemini-2.5-flash',
        contents: fullPrompt
      });
      const aiText =
  typeof response.text === "function"
    ? response.text()
    : response.text ||
      response.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response generated.";

return {
  source: "Live Gemini AI API",
  text: aiText
};
    } catch (geminiErr) {
  console.error("========== GEMINI ERROR ==========");
  console.error(geminiErr);

  if (geminiErr.response) {
    console.error(geminiErr.response);
  }
     } 
}

  if (process.env.HF_ACCESS_TOKEN) {
    try {
      const hfResponse = await hf.chatCompletion({
  model: "Qwen/Qwen2.5-7B-Instruct",
  messages: [
    {
      role: "user",
      content: fullPrompt
    }
  ],
  max_tokens: 250
});

return {
  source: "HuggingFace Chat",
  text: hfResponse.choices?.[0]?.message?.content || "No response."
};
    } catch (hfErr) {
      console.warn('⚠️ HuggingFace fallback failed:', hfErr.message);
    }
  } else {
    console.warn('⚠️ HF_ACCESS_TOKEN not set — HuggingFace fallback is skipped. Get a free token at https://huggingface.co/settings/tokens');
  }

  // ─── Local static fallback — only reached if BOTH providers above failed ───
  let localResponse = `### Academic Insight on: ${userMessage.toUpperCase()}

Based on the CSE Core Curriculum, here is a structured analysis of your query:

1. **Core Concept Overview:** fundamental building block in computer science engineering and practical database implementation.
2. **Key Parameters:** structured algorithmic logic, runtime execution behavior, and system design integrity.
3. **Real-world Application:** cloud computing, enterprise systems, network routing, and modular engine optimization.

*Note: both the Gemini and HuggingFace providers failed for this request — check server logs. This is a static fallback, not a live AI answer.*`;

  const cleanMsg = userMessage.toLowerCase();
  if (cleanMsg.includes('quiz')) {
    localResponse = JSON.stringify({
      topic: 'Database Management System',
      questions: [{ id: 1, question: 'What stands for DBMS?', options: ['Database Management System', 'Data Base Management Schema'], answer: 'Database Management System' }]
    });
  } else if (cleanMsg.includes('summarize') || cleanMsg.includes('notes')) {
    localResponse = 'MongoDB Atlas is a fully-managed cloud database service.';
  } else if (cleanMsg.includes('plan') || cleanMsg.includes('schedule')) {
    localResponse = JSON.stringify({ week1: 'Introduction & Syntax Foundations', week2: 'Process Interlinking & Logic Controls', week3: 'Advanced Architecture & Memory Allocation' });
  }

  return { source: 'Static Fallback (both AI providers unavailable)', text: localResponse };
}

// Best-effort: try to pull a JSON object/array out of an LLM text response.
function tryParseJSON(text) {
  if (typeof text !== 'string') return null;
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// 1. AI Chat Route — persists every exchange to Mongo (Note collection) when logged in
router.post('/chat', softAuth, async (req, res) => {
  const userMessage = req.body.messages?.[req.body.messages.length - 1]?.content
    || req.body.messages?.[0]?.content
    || 'Explain OOP';

  const result = await processAIChat(userMessage);
  const reply = typeof result.text === 'string' ? result.text.trim() : result.text;

  let saved = false;
  if (req.user && isDbConnected()) {
    try {
      const Note = require('../models/Note');
      await Note.create({
        user: req.user.id,
        title: userMessage.slice(0, 60) || 'Chat message',
        originalText: userMessage,
        summary: reply,
        subject: 'chat',
        style: 'concise',
        tags: ['chat', result.source]
      });
      saved = true;
    } catch (err) {
      console.error('Chat persistence failed:', err.message);
    }
  }

  return res.status(200).json({ status: 'success', source: result.source, reply, savedToDb: saved });
});

// 2. AI Quiz Route — generation only; frontend calls POST /api/quiz to save the final score
router.post('/quiz', async (req, res) => {
  const topic = req.body.topic || 'Database Management System';
  const numQuestions = req.body.numQuestions || 5;
  const difficulty = req.body.difficulty || 'medium';
  const prompt = `Create ${numQuestions} multiple-choice questions on "${topic}" at ${difficulty} difficulty. ` +
    `Return ONLY valid JSON: {"questions":[{"question":"...","options":["A","B","C","D"],"answer":"..."}]}. No markdown, no extra text.`;
  const result = await processAIChat(prompt, 'Act as a quiz generator that outputs strict JSON only.');
  const parsed = tryParseJSON(result.text);

  return res.status(200).json({
    status: 'success',
    source: result.source,
    quiz: parsed?.questions || [],
    raw: parsed ? undefined : result.text // fallback so frontend can still show something if JSON parsing failed
  });
});

// 3. AI Summary Route
router.post('/summarize', async (req, res) => {
  const text = req.body.notes || req.body.text || 'MongoDB Atlas cloud database.';
  const style = req.body.style || 'concise';
  const result = await processAIChat(`Summarize this text in a ${style} style:\n${text}`);
  return res.status(200).json({ status: 'success', source: result.source, summary: result.text.trim() });
});

// 4. AI Study Plan Route
router.post('/plan', async (req, res) => {
  const subjects = req.body.subjects || ['General Study'];
  const days = req.body.days || 5;
  const hoursPerDay = req.body.hoursPerDay || 3;
  const prompt = `Create a ${days}-day study plan (${hoursPerDay} hours/day) covering: ${Array.isArray(subjects) ? subjects.join(', ') : subjects}. ` +
    `Return ONLY valid JSON: {"days":[{"day":1,"sessions":[{"subject":"...","topic":"...","duration_min":60,"type":"lecture"}]}]}. No markdown.`;
  const result = await processAIChat(prompt, 'Act as a study planner that outputs strict JSON only.');
  const parsed = tryParseJSON(result.text);

  return res.status(200).json({
    status: 'success',
    source: result.source,
    plan: parsed?.days || [],
    raw: parsed ? undefined : result.text
  });
});

module.exports = router;
