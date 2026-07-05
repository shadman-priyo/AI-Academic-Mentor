/* =============================================
   AUTH UTILITY — CSE4104-7C-T05 (FIXED)
   =============================================
   WHAT WAS WRONG BEFORE:
   This file used to have a fake "UserDB" object that stored users,
   passwords (base64-"encrypted", i.e. not encrypted at all), and
   everything else entirely in localStorage. register.html and login.html
   called UserDB directly and NEVER talked to the real backend at all.
   That's the actual reason nothing showed up in MongoDB — the frontend
   was a fully self-contained fake app sitting on top of a real backend
   it never called.

   FIX: Auth now ALWAYS calls the real backend (/api/auth/register,
   /api/auth/login, /api/auth/me). The JWT + user object returned by the
   backend is cached in localStorage purely so the browser stays logged in
   across page loads — that's normal and fine. The password never touches
   localStorage anymore; bcrypt hashing happens server-side, in Mongo.
   ============================================= */

const AUTH_KEY = 'aim_user';

// ─── API base — same logic as before, still needs to be updated once the
// backend is deployed (see README / bottom of this file). ───
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : 'https://YOUR-BACKEND.onrender.com'; // TODO: replace with your real deployed Render URL

async function apiRequest(method, endpoint, body) {
  const stored = Auth.get();
  const headers = { 'Content-Type': 'application/json' };
  if (stored?.token) headers['Authorization'] = 'Bearer ' + stored.token;

  const res = await fetch(API_BASE + endpoint, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Server error ${res.status}`);
  }
  return data;
}

const Auth = {
  save(user, token) {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ ...user, token }));
  },
  get() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  isLoggedIn() { return !!this.get()?.token; },
  logout() {
    localStorage.removeItem(AUTH_KEY);
    window.location.href = '../../index.html';
  },
  require() {
    if (!this.isLoggedIn()) window.location.href = 'login.html';
    return this.get();
  },
  requireAdmin() {
    const user = this.require();
    if (user && user.role !== 'admin') window.location.href = 'dashboard.html';
    return user;
  },
  initials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  },

  // ── Real backend calls ──────────────────────────────────────
  async register({ name, email, password, studentId, department, role, adminAccessCode }) {
    const data = await apiRequest('POST', '/api/auth/register', {
      name, email, password, studentId, department, role, adminAccessCode
    });
    this.save(data.user, data.token);
    if (data.demoMode) {
      console.warn('Registered in DEMO MODE — MongoDB is not connected on the backend. This account will NOT persist.');
    }
    return data;
  },

  async login(email, password) {
    const data = await apiRequest('POST', '/api/auth/login', { email, password });
    this.save(data.user, data.token);
    if (data.demoMode) {
      console.warn('Logged in via DEMO MODE — MongoDB is not connected on the backend.');
    }
    return data;
  },

  async refreshMe() {
    const data = await apiRequest('GET', '/api/auth/me');
    const current = this.get();
    this.save(data.user, current?.token);
    return data.user;
  }
};

// ─── Local cache for offline / instant UI rendering only.
// The backend (MongoDB) is always the source of truth — see BackendAPI below.
const DataStore = {
  KEY_PREFIX: 'aim_cache_',
  key(section, userId) {
    const uid = userId || Auth.get()?.id || 'guest';
    return this.KEY_PREFIX + uid + '_' + section;
  },
  get(section, userId) {
    try { return JSON.parse(localStorage.getItem(this.key(section, userId)) || 'null'); }
    catch { return null; }
  },
  set(section, data, userId) {
    localStorage.setItem(this.key(section, userId), JSON.stringify(data));
  },
  push(section, item, userId) {
    const arr = this.get(section, userId) || [];
    arr.unshift(item);
    this.set(section, arr, userId);
    return arr;
  },
  getForUser(userId, section) { return this.get(section, userId); }
};

// ─── AI API — ALL CALLS GO THROUGH BACKEND PROXY ─────────────────────────
// The Gemini API key lives in backend/.env only. Frontend never touches it.
// FIX: field names now match what routes/ai.js actually returns
// (reply / quiz / plan / summary) — the old code read data.reply,
// data.questions, data.plan while the backend sent message/quizData/
// studyPlan, so every one of these silently returned nothing.
const GeminiAPI = {
  BASE: API_BASE,

  async _post(endpoint, body) {
    return apiRequest('POST', endpoint, body);
  },

  async chat(messages) {
    const data = await this._post('/api/ai/chat', { messages });
    return data.reply || 'No response generated.';
  },

  async call(prompt, systemContext = '') {
    const messages = [{ role: 'user', content: systemContext ? systemContext + '\n\n' + prompt : prompt }];
    return this.chat(messages);
  },

  async generateQuiz(topic, numQuestions = 5, difficulty = 'medium', type = 'mcq') {
    const data = await this._post('/api/ai/quiz', { topic, numQuestions, difficulty, type });
    return data.quiz && data.quiz.length ? data.quiz : { raw: data.raw };
  },

  async summarize(notes, subject, style = 'concise') {
    const data = await this._post('/api/ai/summarize', { notes, subject, style });
    return data.summary || '';
  },

  async generatePlan(subjects, days = 5, hoursPerDay = 3, goal = 'revision', level = 'intermediate') {
    const data = await this._post('/api/ai/plan', { subjects, days, hoursPerDay, goal, level });
    return data.plan && data.plan.length ? data.plan : { raw: data.raw };
  }
};

// ─── Backend-backed CRUD for quiz results / study plans / summaries ───
// FIX: this is new. Before, quiz.html / planner.html / summarizer.html
// only ever wrote to DataStore (localStorage) — the real /api/quiz,
// /api/plan, /api/summary endpoints existed on the backend and were
// never called by anything. These wrappers actually persist to MongoDB.
const BackendAPI = {
  async saveQuizResult(payload) { return apiRequest('POST', '/api/quiz', payload); },
  async listQuizResults() { return apiRequest('GET', '/api/quiz'); },

  async savePlan(payload) { return apiRequest('POST', '/api/plan', payload); },
  async listPlans() { return apiRequest('GET', '/api/plan'); },

  async saveSummary(payload) { return apiRequest('POST', '/api/summary', payload); },
  async listSummaries() { return apiRequest('GET', '/api/summary'); },

  async getProgress() { return apiRequest('GET', '/api/progress'); }
};

// ─── Admin API — real backend calls (used by admin.html) ───
// FIX: admin.html used to manage users entirely through the fake UserDB
// (localStorage). It's fully rewired below to hit /api/admin/*, which was
// already correctly built on the backend but never actually called.
const AdminAPI = {
  async stats() { return apiRequest('GET', '/api/admin/stats'); },
  async listUsers(params = '') { return apiRequest('GET', '/api/admin/users' + params); },
  async getUser(id) { return apiRequest('GET', `/api/admin/users/${id}`); },
  async getUserActivity(id) { return apiRequest('GET', `/api/admin/users/${id}/activity`); },
  async updateUser(id, updates) { return apiRequest('PUT', `/api/admin/users/${id}`, updates); },
  async deleteUser(id) { return apiRequest('DELETE', `/api/admin/users/${id}`); }
};

// Notification store (local-only feature, not backed by a Mongo model in this project)
const Notifications = {
  get() { return DataStore.get('notifications') || []; },
  add(text, type = 'info') {
    DataStore.push('notifications', {
      id: Date.now(), text, type, read: false, time: new Date().toISOString()
    });
  },
  markRead() {
    const n = this.get().map(n => ({ ...n, read: true }));
    DataStore.set('notifications', n);
  },
  unreadCount() { return this.get().filter(n => !n.read).length; }
};

// ─── UTILS ────────────────────────────────────────────────────────────────
function timeAgo(isoStr) {
  const diff = Math.floor((Date.now() - new Date(isoStr)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return new Date(isoStr).toLocaleDateString();
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str || ''));
  return d.innerHTML;
}

function formatMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:var(--bg-3);padding:2px 6px;border-radius:4px;font-family:var(--mono);font-size:0.85em;">$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.+)/, '<p>$1</p>');
}

// NOTE: replace API_BASE's production fallback URL above with your real
// Render backend URL once deployed (this was the "auth.js line 53 placeholder"
// from your notes — it's now at the top of this file, clearly marked TODO).
