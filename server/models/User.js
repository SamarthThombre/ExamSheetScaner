const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Role values: 'super_admin' | 'college_admin' | 'teacher' | 'student'
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/\S+@\S+\.\S+/, 'Email is invalid']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false          // never returned in queries by default
  },
  role: {
    type: String,
    enum: ['super_admin', 'college_admin', 'teacher', 'student'],
    default: 'teacher'
  },
  college: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    default: null          // null for super_admin
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  assignedSubjects: [{
    type: String,
    uppercase: true,
    trim: true
  }],
  // Student-specific fields
  rollNumber: {
    type: String,
    uppercase: true,
    trim: true,
    sparse: true
  },
  enrolmentNo: {
    type: String,
    uppercase: true,
    trim: true,
    sparse: true
  },
  enrolledSubjects: [{
    type: String,
    uppercase: true,
    trim: true
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Pre-save hook: sync enrolmentNo and rollNumber, hash password
userSchema.pre('save', async function(next) {
  if (this.enrolmentNo && !this.rollNumber) {
    this.rollNumber = this.enrolmentNo;
  } else if (this.rollNumber && !this.enrolmentNo) {
    this.enrolmentNo = this.rollNumber;
  }
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
