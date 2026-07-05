/**
 * AI Academic Mentor — Database Schema Reference
 * CSE4104-7C-T05 | NUBTK 2026
 * MongoDB Collections — Week 06
 * ================================================
 *
 * Collections:
 *   1. users
 *   2. quizresults
 *   3. studyplans
 *   4. notes
 *
 * All _id fields are MongoDB ObjectId (Primary Key)
 * All collections have: createdAt, updatedAt (via timestamps: true)
 */

/*
 * ── COLLECTION: users ──────────────────────────────────────────
 * Stores all user accounts (students and admins)
 *
 * Field         | Type      | Required | Notes
 * --------------|-----------|----------|----------------------------
 * _id           | ObjectId  | PK       | Auto-generated
 * name          | String    | YES      | 2–100 chars
 * email         | String    | YES      | Unique, lowercase, indexed
 * password      | String    | YES      | bcrypt hash, select:false
 * studentId     | String    | NO       | e.g. CSE-2301
 * department    | String    | NO       | Default: 'CSE'
 * role          | String    | NO       | 'student' | 'admin'
 * isActive      | Boolean   | NO       | Default: true
 * profilePicture| String    | NO       | URL or null
 * lastLogin     | Date      | NO       | Updated on each login
 * createdAt     | Date      | AUTO     | Mongoose timestamp
 * updatedAt     | Date      | AUTO     | Mongoose timestamp
 *
 * Indexes: email (unique), role
 *
 * ── COLLECTION: quizresults ─────────────────────────────────────
 * Stores quiz attempt results per user
 *
 * Field         | Type      | Required | Notes
 * --------------|-----------|----------|----------------------------
 * _id           | ObjectId  | PK       | Auto-generated
 * user          | ObjectId  | FK→users | Indexed
 * topic         | String    | YES      | Quiz subject topic
 * score         | Number    | YES      | 0–100 percentage
 * numQuestions  | Number    | YES      | Total questions
 * correct       | Number    | YES      | Correct answers count
 * difficulty    | String    | NO       | easy|medium|hard
 * type          | String    | NO       | mcq|truefalse|mixed
 * answers       | Mixed     | NO       | Full answer log
 * createdAt     | Date      | AUTO     |
 * updatedAt     | Date      | AUTO     |
 *
 * Indexes: user (index)
 *
 * ── COLLECTION: studyplans ──────────────────────────────────────
 * Stores AI-generated study plans per user
 *
 * Field         | Type      | Required | Notes
 * --------------|-----------|----------|----------------------------
 * _id           | ObjectId  | PK       |
 * user          | ObjectId  | FK→users | Indexed
 * title         | String    | NO       | Default: 'My Study Plan'
 * subjects      | [String]  | NO       | Array of subject names
 * days          | [Object]  | NO       | Array of day objects (see below)
 * goal          | String    | NO       | revision|exam|practice
 * hoursPerDay   | Number    | NO       | Default: 3
 * level         | String    | NO       | beginner|intermediate|advanced
 * isActive      | Boolean   | NO       | Default: true
 * createdAt     | Date      | AUTO     |
 * updatedAt     | Date      | AUTO     |
 *
 * days[n] sub-document:
 *   day          | Number  | Day number (1-based)
 *   date_label   | String  | e.g. "Day 1 — Monday"
 *   total_hours  | Number  |
 *   sessions[n]:
 *     subject    | String  |
 *     topic      | String  |
 *     duration_min | Number |
 *     type       | String  | lecture|practice|revision|break
 *     priority   | String  | high|medium|low
 *     tips       | String  |
 *     completed  | Boolean | Default: false
 *
 * ── COLLECTION: notes ───────────────────────────────────────────
 * Stores user notes and AI-generated summaries
 *
 * Field         | Type      | Required | Notes
 * --------------|-----------|----------|----------------------------
 * _id           | ObjectId  | PK       |
 * user          | ObjectId  | FK→users | Indexed
 * title         | String    | YES      | Max 200 chars
 * originalText  | String    | YES      | User's raw notes
 * summary       | String    | NO       | AI-generated summary
 * subject       | String    | NO       | Subject/course tag
 * style         | String    | NO       | concise|detailed|bullets|exam
 * tags          | [String]  | NO       | Custom tags
 * createdAt     | Date      | AUTO     |
 * updatedAt     | Date      | AUTO     |
 *
 * ── RELATIONSHIPS ───────────────────────────────────────────────
 *
 * users (1) ──────< quizresults  (many)  [user._id = quizresults.user]
 * users (1) ──────< studyplans   (many)  [user._id = studyplans.user]
 * users (1) ──────< notes        (many)  [user._id = notes.user]
 *
 * No cascading deletes configured — admin must manually purge user data.
 */
