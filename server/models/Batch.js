const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  examName: {
    type: String,
    required: [true, 'Exam name is required'],
    trim: true
  },
  subjectCode: {
    type: String,
    required: [true, 'Subject code is required'],
    trim: true,
    uppercase: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  college: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'processing', 'done', 'published'],
    default: 'draft'
  },
  totalSheets:  { type: Number, default: 0 },
  okCount:      { type: Number, default: 0 },
  checkCount:   { type: Number, default: 0 },
  rescanCount:  { type: Number, default: 0 },
  errorCount:   { type: Number, default: 0 },
  publishedAt:  { type: Date, default: null },

  // Student Roster for the batch / course (for name mapping and missing sheet detection)
  studentList: [
    {
      enrolmentNo: {
        type: String,
        required: true,
        uppercase: true,
        trim: true
      },
      name: {
        type: String,
        trim: true,
        default: ''
      }
    }
  ],

  // Course Outcome (CO) Attainment Settings & Computed Class Averages
  coMaxMarks:       { type: Number, default: 14 },
  coThresholdHigh:  { type: Number, default: 65 },
  coThresholdMid:   { type: Number, default: 50 },
  coAttainment: {
    co1: { classAvgOB: Number, classAvgPct: Number, attainmentLevel: Number, targetMarks: Number },
    co2: { classAvgOB: Number, classAvgPct: Number, attainmentLevel: Number, targetMarks: Number },
    co3: { classAvgOB: Number, classAvgPct: Number, attainmentLevel: Number, targetMarks: Number },
    co4: { classAvgOB: Number, classAvgPct: Number, attainmentLevel: Number, targetMarks: Number },
    co5: { classAvgOB: Number, classAvgPct: Number, attainmentLevel: Number, targetMarks: Number },
    overallAverage: Number
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

batchSchema.virtual('reviewRate').get(function () {
  if (!this.totalSheets) return 0;
  return Math.round(((this.checkCount + this.rescanCount) / this.totalSheets) * 100);
});

module.exports = mongoose.model('Batch', batchSchema);
