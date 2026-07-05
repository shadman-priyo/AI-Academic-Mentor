/**
 * DB State Helper
 * CSE4104-7C-T05 | AI Academic Mentor
 *
 * WHY THIS FILE EXISTS:
 * The original routes wrapped every Mongoose call in try/catch and silently
 * fell back to an in-memory array on ANY error — including real bugs
 * (validation errors, duplicate keys, network blips). That means the API
 * could return "200 OK, saved!" while writing NOTHING to MongoDB, and you'd
 * never know unless you manually checked Atlas. That's the #1 reason your
 * register/login data wasn't showing up in the database.
 *
 * Fix: only use the in-memory fallback when Mongo is genuinely disconnected
 * (mongoose.connection.readyState !== 1). Any other error is a real bug and
 * gets returned to the client as a 500 with the actual message, instead of
 * being hidden.
 */

const mongoose = require('mongoose');

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { isDbConnected };
