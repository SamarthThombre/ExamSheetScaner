const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentRoll: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  college: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    required: true
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    default: null
  },
  sheet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sheet',
    default: null
  },
  subjectCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  issueType: {
    type: String,
    enum: ['marks_mismatch', 'missing_question', 'incorrect_enrolment', 're_evaluation', 'other'],
    default: 'marks_mismatch'
  },
  description: {
    type: String,
    required: [true, 'Please explain the issue in detail'],
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_review', 'resolved', 'rejected'],
    default: 'pending'
  },
  teacherResponse: {
    type: String,
    default: ''
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Issue', issueSchema);
