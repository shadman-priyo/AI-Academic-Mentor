/**
 * Note / Summary Model
 * CSE4104-7C-T05 | AI Academic Mentor
 */

const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 200
  },
  originalText: {
    type: String,
    required: [true, 'Original text is required']
  },
  summary: {
    type: String,
    default: null
  },
  subject: {
    type: String,
    trim: true,
    default: null
  },
  style: {
    type: String,
    enum: ['concise', 'detailed', 'bullets', 'exam'],
    default: 'concise'
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Note', noteSchema);
