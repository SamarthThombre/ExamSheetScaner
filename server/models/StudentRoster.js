const mongoose = require('mongoose');

const studentRosterSchema = new mongoose.Schema(
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
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    college: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      required: true
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: false,
      default: null
    },
    session: {
      type: String,
      trim: true,
      default: ''
    },
    isRegistered: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Unique index: { enrolmentNo: 1, college: 1 }
studentRosterSchema.index({ enrolmentNo: 1, college: 1 }, { unique: true });

module.exports = mongoose.model('StudentRoster', studentRosterSchema);
