# FIX LOG — CSE4104-7C-T05 AI Academic Mentor
(Read this before you touch anything else. Every fix is also commented in-place in the code.)

## 1. WHY MONGODB WAS EMPTY (the actual bug you asked about)
Your frontend register/login pages (`register.html`, `login.html`) never called your
backend at all. They ran on a fake, fully client-side `UserDB` object that stored
"users" — including base64 "encrypted" passwords — in `localStorage`. Your real
backend, with real bcrypt hashing and a real Mongoose `User` model, was sitting
there fully built and 100% unused. That's why nothing ever landed in Atlas: the
button you were clicking never sent a network request to your server.

Fixed: `components/auth.js` was rewritten with no `UserDB`. `Auth.register()` /
`Auth.login()` now call `/api/auth/register` and `/api/auth/login` for real.
`register.html` / `login.html` were rewired to use them.

## 2. A SECOND, INDEPENDENT BUG IN THE SAME AREA
Even if the frontend HAD been calling the backend, `routes/auth.js` wrapped every
Mongoose write in `try { ...db stuff... } catch(dbErr) { ...fake success from an
in-memory array... }`. That swallows real errors (bad connection, validation,
whatever) and returns "200 registered!" while writing nothing to Mongo. This exact
pattern existed in `auth.js`, `quiz.js`, `plan.js`, and `summary.js`.

Fixed: added `middleware/db.js` (`isDbConnected()`), rewrote all four routes to only
use the in-memory fallback when Mongo is genuinely disconnected, and to return real
500 errors otherwise instead of hiding them. Responses are now tagged `demoMode` so
it's obvious when something isn't actually persisted.

## 3. WHY YOUR "AI" FELT FAKE
`GEMINI_API_KEY` in `.env` (`AQ.Ab8RN6...`) is not a Gemini Developer API key —
real ones start with `AIza` and come from https://aistudio.google.com/app/apikey.
The value you have looks like a Google OAuth access token (a different credential
type entirely, and one that expires in about an hour anyway). Every Gemini call was
failing, silently, on every single request.

On top of that, `routes/ai.js` returned `{ message, quizData, studyPlan }` while your
own frontend (`components/auth.js`) read `data.reply`, `data.questions`, `data.plan`
— field names that never matched. So even a working AI call would have shown "No
response generated." forever.

And on top of THAT: `quiz.html`, `planner.html`, `summarizer.html` all called
`GeminiAPI.getKey()` — a function that was deleted from `auth.js` a while ago. That's
a `TypeError` thrown before the request even goes out. Quiz, planner, and summarizer
were dead on arrival, 100% of the time, for a reason that has nothing to do with
Gemini at all.

Fixed:
- `.env` / `.env.example` now flag the invalid key format loudly, at boot and on
  every failed call.
- `routes/ai.js` now returns consistent `reply` / `quiz` / `plan` / `summary` keys,
  matching the frontend.
- Dead `getKey()` calls removed from all three pages.

## 4. "UNLIMITED FREE API KEY" — this idea is bad, here's why
There is no such thing as an unlimited free LLM API key. Full stop. Gemini's free
tier (`gemini-2.0-flash`) has real per-minute and per-day request caps; if you blow
through them the API just starts returning 429s. Anyone offering an "unlimited free"
key is either rate-limiting you invisibly, training on your data as payment, or
lying. Chasing "no limit" is the wrong goal for a class project — the right goal is
graceful degradation when you DO hit a limit, which your architecture already
half-had (Gemini → HuggingFace → static text) but which was broken at every step
(see #3). I fixed the chain instead of chasing a key that doesn't exist:
1. Gemini (needs a real `AIza...` key from you)
2. HuggingFace free inference (needs a free token from
   https://huggingface.co/settings/tokens — `HF_ACCESS_TOKEN` was empty, so this
   tier was silently skipped every time)
3. Static fallback text (last resort, clearly labeled as such in the response)
Get both real keys and this becomes "effectively free for a class project," which is
the honest version of what you were asking for.

## 5. CHAT / QUIZ / PLAN / SUMMARY DATA DIDN'T REACH MONGODB EITHER
Even with the AI calls working, none of the four core features ever persisted
anything. `quiz.html`, `planner.html`, `summarizer.html` only wrote to
`localStorage`. Fully-built backend endpoints (`/api/quiz`, `/api/plan`,
`/api/summary`) existed and were never called by anything.

Fixed: all three pages now call the real backend right after generating content
(`BackendAPI.saveQuizResult / savePlan / saveSummary`), in addition to the local
cache for instant UI. `routes/ai.js`'s `/chat` endpoint now auto-saves every chat
exchange to a `Note` document (subject: `'chat'`) when the user is logged in — that
gets you the "as soon as I type, I can see it in the database" behavior you asked
for, for chat specifically.

## 6. ADMIN ACCESS CODE WAS CLIENT-SIDE ONLY
`register.html` checked the admin signup code (`NUBTK-ADMIN-2026`) in the browser.
Readable in devtools by anyone, and never re-checked by the old backend at all — a
raw API call with `role: "admin"` would have worked with zero code.

Fixed: `routes/auth.js` now validates `adminAccessCode` server-side and ignores
whatever role the client asks for unless the code matches.

## 7. THE ADMIN DASHBOARD USER-MANAGEMENT PANEL WAS ENTIRELY FAKE
`admin.html` managed "all users" through `UserDB` — again, per-browser
`localStorage`. Two admins on two different computers would see two different fake
user lists. Per-user quiz/chat/plan counts were read via
`DataStore.getForUser(otherUserId, ...)`, which reads from the CURRENT ADMIN's OWN
browser storage — it could never contain another person's data. Those numbers were
always silently 0.

Fixed: rewired to real `/api/admin/*` endpoints (which existed and were correct, just
unused). Added a new `/api/admin/users/:id/activity` endpoint so per-user activity
counts are real, from MongoDB. Removed/relabeled the bulk-wipe buttons that
previously only nuked localStorage — a real "wipe everyone's Mongo data" action is
deliberately NOT wired to a button; that's not something a UI click should do by
accident.

## 8. `chatbot.html` HARDCODED `http://localhost:5000`
Guaranteed to break the instant this app is opened from anywhere but your own dev
machine — including your deployed Netlify site. It also double-saved chat messages
to `/api/notes` manually, duplicating the persistence now handled inside
`routes/ai.js` itself.

Fixed: uses `GeminiAPI.chat()`, which respects the environment-aware `API_BASE` in
`components/auth.js`. Duplicate manual save removed.

## 9. DEMO CREDENTIALS DIDN'T ACTUALLY EXIST IN THE DATABASE
`admin@nubtk.edu` / `student@nubtk.edu` were referenced in your project notes but
only ever existed as fake entries seeded into `localStorage` by `login.html` on
every page load — never real Mongo documents.

Fixed: added to `database/seed.js`. Run `npm run seed` (or `node database/seed.js`)
after connecting to your real MongoDB to create them for real.

---

## WHAT YOU STILL HAVE TO DO — none of this can be faked from here
1. **Get a real Gemini key**: https://aistudio.google.com/app/apikey → put it in
   `.env` as `GEMINI_API_KEY` (must start with `AIza`).
2. **Get a free HuggingFace token**: https://huggingface.co/settings/tokens → put it
   in `.env` as `HF_ACCESS_TOKEN`.
3. **Update `frontend/components/auth.js` line ~21** (`API_BASE`) with your real
   deployed Render backend URL once it's live. This was the "auth.js line 53
   placeholder" from your notes — it moved but the TODO is still there, clearly
   marked.
4. **Run `npm run seed`** against your real MongoDB Atlas connection to create the
   demo accounts for real.
5. **Test it yourself.** I fixed and syntax-checked every file, but I cannot run
   your live MongoDB Atlas cluster or a real Gemini key from this environment — you
   need to actually run `npm start`, register a real account, and go check MongoDB
   Atlas with your own eyes to confirm the document is there. Don't take my word for
   it. Don't take your own word for it either until you've SEEN the document in
   Atlas.
6. **Announcements in `admin.html` are still local-only** — flagged honestly in the
   code, not silently faked. Wiring that up for real needs a new `Announcement`
   Mongo model + a route students poll. Small addition if you want it next, but out
   of scope for a bug-fix pass.
7. **Full data export/wipe across ALL users** (not just user list) needs a dedicated,
   deliberately-guarded backend endpoint. Deliberately not wired to a UI button —
   that kind of destructive bulk action shouldn't be one accidental click away.
