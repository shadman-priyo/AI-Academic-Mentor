/**
 * StudyPlan Model
 * CSE4104-7C-T05 | AI Academic Mentor
 */

const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  subject: String,
  topic: String,
  duration_min: Number,
  type: {
  type: String,
  enum: [
    'lecture',
    'practice',
    'review',
    'revision',
    'assignment',
    'break'
  ],
  default: 'lecture'
},
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  tips: String,
  completed: { type: Boolean, default: false }
}, { _id: false });

const daySchema = new mongoose.Schema({
  day: Number,
  date_label: String,
  total_hours: Number,
  sessions: [sessionSchema]
}, { _id: false });

const studyPlanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    default: 'My Study Plan',
    trim: true
  },
  subjects: [{
    type: String,
    trim: true
  }],
  days: [daySchema],
  goal: {
    type: String,
    default: 'revision'
  },
  hoursPerDay: {
    type: Number,
    default: 3
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('StudyPlan', studyPlanSchema);
