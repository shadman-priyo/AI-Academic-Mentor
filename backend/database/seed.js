/**
 * Database Seed Script
 * CSE4104-7C-T05 | AI Academic Mentor
 *
 * Usage: node database/seed.js
 * Creates: 4 admin accounts + sample student accounts
 */
// ============ FORCE GLOBAL DNS RESOLVER FOR SEED PIPELINE ============
const dns = require('node:dns');
dns.setServers(['1.1.1.1', '1.0.0.1', '8.8.8.8', '8.8.4.4']);

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not set in .env');
  process.exit(1);
}

// Inline schema to avoid circular require
const userSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  email:      { type: String, required: true, unique: true, lowercase: true },
  password:   { type: String, required: true, select: false },
  studentId:  { type: String, default: null },
  department: { type: String, default: 'CSE' },
  role:       { type: String, enum: ['student', 'admin'], default: 'student' },
  isActive:   { type: Boolean, default: true },
  lastLogin:  { type: Date, default: null }
}, { timestamps: true });
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
const User = mongoose.model('User', userSchema);

const seedData = {
  // NOTE: 'admin@nubtk.edu' / 'student@nubtk.edu' are the demo credentials
  // referenced elsewhere in this project's docs. They previously only
  // existed as FAKE localStorage entries seeded by login.html on every page
  // load — they never existed in MongoDB. Adding them here for real.
  admins: [
    { name: 'Nadir',        email: 'admin@nubtk.edu',  password: 'admin123',     role: 'admin', department: 'CSE' },
    { name: 'Admin One',    email: 'admin1@nubtk.edu', password: 'Admin@1234',   role: 'admin', department: 'CSE' },
    { name: 'Admin Two',    email: 'admin2@nubtk.edu', password: 'Admin@1234',   role: 'admin', department: 'CSE' },
    { name: 'Admin Three',  email: 'admin3@nubtk.edu', password: 'Admin@1234',   role: 'admin', department: 'CSE' },
    { name: 'Admin Four',   email: 'admin4@nubtk.edu', password: 'Admin@1234',   role: 'admin', department: 'CSE' },
  ],
  students: [
    { name: 'Shadman Priyo', email: 'student@nubtk.edu', password: 'student123',  studentId: '11230121168', department: 'CSE' },
    { name: 'Alice Rahman',  email: 'alice@nubtk.edu',   password: 'Student@123', studentId: 'CSE-2301', department: 'CSE' },
    { name: 'Bob Hossain',   email: 'bob@nubtk.edu',     password: 'Student@123', studentId: 'CSE-2302', department: 'CSE' },
    { name: 'Chayon Ahmed',  email: 'chayon@nubtk.edu',  password: 'Student@123', studentId: 'CSE-2303', department: 'CSE' },
  ]
};

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    for (const adminData of seedData.admins) {
      const existing = await User.findOne({ email: adminData.email });
      if (existing) {
        console.log(`⏩ Skipped (exists): ${adminData.email}`);
        continue;
      }
      const admin = new User(adminData);
      await admin.save();
      console.log(`✅ Created admin: ${adminData.email}`);
    }

    for (const studentData of seedData.students) {
      const existing = await User.findOne({ email: studentData.email });
      if (existing) {
        console.log(`⏩ Skipped (exists): ${studentData.email}`);
        continue;
      }
      const student = new User(studentData);
      await student.save();
      console.log(`✅ Created student: ${studentData.email}`);
    }

    console.log('\n🎉 Seed complete!');
    console.log('Admin credentials:   admin@nubtk.edu / admin123');
    console.log('Student credentials: student@nubtk.edu / student123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seed();
