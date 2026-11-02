const mongoose = require('mongoose');

const accessRequestSchema = new mongoose.Schema(
  {
    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      required: [true, 'College reference is required']
    },
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true
    },
    enrolmentNo: {
      type: String,
      required: [true, 'Enrolment / Roll number is required'],
      uppercase: true,
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      lowercase: true,
      trim: true
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null
    },
    departmentName: {
      type: String,
      trim: true,
      default: ''
    },
    requestType: {
      type: String,
      enum: ['missing_roster', 'email_mismatch', 'department_change', 'other'],
      default: 'missing_roster'
    },
    reason: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    adminRemarks: {
      type: String,
      trim: true,
      default: ''
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Index for fast lookups by college and status
accessRequestSchema.index({ college: 1, status: 1 });
accessRequestSchema.index({ college: 1, enrolmentNo: 1 });
accessRequestSchema.index({ email: 1 });

module.exports = mongoose.model('AccessRequest', accessRequestSchema);
