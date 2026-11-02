const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Subject name is required'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Subject code is required'],
    uppercase: true,
    trim: true
  }
}, { timestamps: true });

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Department/Branch name is required'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Department code is required'],
    uppercase: true,
    trim: true
  },
  college: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    required: true
  },
  subjects: [subjectSchema]
}, { timestamps: true });

// Ensure unique department code per college
departmentSchema.index({ college: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
