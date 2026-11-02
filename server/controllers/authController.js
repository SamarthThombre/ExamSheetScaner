const asyncHandler = require('express-async-handler');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const College = require('../models/College');
const Department = require('../models/Department');
const StudentRoster = require('../models/StudentRoster');
const generateToken = require('../utils/generateToken');

// @desc    Public verification of college and its branches/subjects
// @route   GET /api/auth/college-branches
// @access  Public
const getCollegeBranches = asyncHandler(async (req, res) => {
  const { code } = req.query;
  if (!code) {
    res.status(400);
    throw new Error('College code is required');
  }

  const college = await College.findOne({ code: code.toUpperCase().trim() });
  if (!college) {
    res.status(404);
    throw new Error('College not found. Please verify the college code with your institution.');
  }

  const departments = await Department.find({ college: college._id }).sort({ name: 1 });

  res.status(200).json({
    success: true,
    data: {
      college: {
        _id: college._id,
        name: college.name,
        code: college.code,
        address: college.address
      },
      departments
    }
  });
});

// @desc    Verify student enrolment and email against college roster before registration
// @route   POST /api/auth/verify-student-email
// @access  Public
const verifyStudentEmail = asyncHandler(async (req, res) => {
  const { collegeCode, enrolmentNo, email } = req.body;

  if (!collegeCode || !enrolmentNo || !email) {
    res.status(400);
    throw new Error('College code, enrolment number, and email are required');
  }

  const college = await College.findOne({ code: collegeCode.toUpperCase().trim() });
  if (!college) {
    res.status(404);
    throw new Error('College not found with the provided code');
  }

  const cleanRoll = enrolmentNo.toUpperCase().trim();
  const cleanEmail = email.toLowerCase().trim();

  // 1. Check if user already exists
  const userExists = await User.findOne({
    college: college._id,
    $or: [{ enrolmentNo: cleanRoll }, { rollNumber: cleanRoll }]
  });
  if (userExists) {
    return res.status(400).json({
      success: false,
      verified: false,
      message: `Enrolment ID "${cleanRoll}" has already been registered. Please log in.`
    });
  }

  // 2. Check College Admin Student Roster
  const roster = await StudentRoster.findOne({
    college: college._id,
    enrolmentNo: cleanRoll
  }).populate('department', 'name code');

  if (!roster) {
    return res.status(404).json({
      success: false,
      verified: false,
      message: `Enrolment ID "${cleanRoll}" is not found in the official college roster. Please contact your College Administrator to add your details first.`
    });
  }

  if (roster.isRegistered) {
    return res.status(400).json({
      success: false,
      verified: false,
      message: `Enrolment ID "${cleanRoll}" is already registered. Please sign in.`
    });
  }

  // 3. Strict Email check: can only register with the roster email
  const rosterEmail = (roster.email || '').toLowerCase().trim();
  if (rosterEmail && rosterEmail !== cleanEmail) {
    return res.status(403).json({
      success: false,
      verified: false,
      officialEmail: rosterEmail,
      message: `Email mismatch! Enrolment ID "${cleanRoll}" is registered under official email: "${rosterEmail}". You can only register with this email.`
    });
  }

  res.status(200).json({
    success: true,
    verified: true,
    studentName: roster.name,
    department: roster.department,
    message: roster.name
      ? `Email verified! Matches official college roster for ${roster.name}.`
      : 'Email verified! Matches official college roster.'
  });
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  let {
    name,
    email,
    password,
    role = 'teacher',
    collegeCode,
    rollNumber,
    enrolmentNo,
    departmentId
  } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Please provide name, email, and password');
  }

  if (role !== 'teacher') {
    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      res.status(400);
      throw new Error('User with this email already exists');
    }
  }

  let collegeId = null;
  let enrolledSubjects = [];
  let finalRoll = null;

  if (role !== 'super_admin') {
    if (!collegeCode) {
      res.status(400);
      throw new Error('College code is required for this role');
    }
    const college = await College.findOne({ code: collegeCode.toUpperCase().trim() });
    if (!college) {
      res.status(400);
      throw new Error('College not found with the provided code');
    }
    collegeId = college._id;

    if (role === 'teacher') {
      const authorizedTeacher = await User.findOne({
        email: email.toLowerCase().trim(),
        role: 'teacher',
        college: collegeId
      });

      if (!authorizedTeacher) {
        res.status(403);
        throw new Error('Teacher email is not pre-registered in this college database. Please ask your College Administrator to add your faculty email first.');
      }

      // Pre-authorized teacher activating their account
      authorizedTeacher.password = password;
      authorizedTeacher.name = name.trim();
      authorizedTeacher.isActive = true;
      await authorizedTeacher.save();

      generateToken(authorizedTeacher._id, res);

      return res.status(200).json({
        success: true,
        data: {
          _id: authorizedTeacher._id,
          name: authorizedTeacher.name,
          email: authorizedTeacher.email,
          role: authorizedTeacher.role,
          college: authorizedTeacher.college,
          department: authorizedTeacher.department,
          assignedSubjects: authorizedTeacher.assignedSubjects || [],
          isActive: authorizedTeacher.isActive,
          createdAt: authorizedTeacher.createdAt,
          updatedAt: authorizedTeacher.updatedAt
        }
      });
    }

    if (role === 'student') {
      finalRoll = (enrolmentNo || rollNumber || '').toUpperCase().trim();
      if (!finalRoll) {
        res.status(400);
        throw new Error('Roll Number / Enrolment ID is required for student registration');
      }

      // Check if student user already registered
      const existingRoll = await User.findOne({
        college: collegeId,
        $or: [{ rollNumber: finalRoll }, { enrolmentNo: finalRoll }]
      });
      if (existingRoll) {
        res.status(400);
        throw new Error('A student with this Roll Number / Enrolment ID is already registered in this college');
      }

      // Check against College Admin's Student Roster
      const rosterEntry = await StudentRoster.findOne({
        college: collegeId,
        enrolmentNo: finalRoll
      });

      if (!rosterEntry) {
        res.status(403);
        throw new Error(`Enrolment ID "${finalRoll}" is not found in the official college roster. Please contact your College Administrator to be added to the student roster first.`);
      }

      // Strict Email check: student can ONLY register with the email in the roster
      const rosterEmail = (rosterEntry.email || '').toLowerCase().trim();
      const enteredEmail = email.toLowerCase().trim();

      if (rosterEmail && rosterEmail !== enteredEmail) {
        res.status(403);
        throw new Error(`Enrolment ID "${finalRoll}" is pre-registered under official email "${rosterEmail}". You can only register with this email address.`);
      }

      // Auto-assign department if roster has it
      if (!departmentId && rosterEntry.department) {
        departmentId = rosterEntry.department;
      }

      if (!departmentId) {
        res.status(400);
        throw new Error('Please select your academic branch / department');
      }

      const dept = await Department.findOne({ _id: departmentId, college: collegeId });
      if (dept && dept.subjects) {
        enrolledSubjects = dept.subjects.map((s) => s.code);
      }
    }
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    college: collegeId,
    department: departmentId || null,
    rollNumber: finalRoll || (rollNumber ? rollNumber.toUpperCase().trim() : undefined),
    enrolmentNo: finalRoll || (enrolmentNo ? enrolmentNo.toUpperCase().trim() : undefined),
    enrolledSubjects
  });

  generateToken(user._id, res);

  // Mark matching StudentRoster entry as registered
  if (role === 'student' && (user.enrolmentNo || user.rollNumber)) {
    const studentEnrol = user.enrolmentNo || user.rollNumber;
    try {
      await StudentRoster.findOneAndUpdate(
        { enrolmentNo: studentEnrol, college: user.college },
        { isRegistered: true }
      );
    } catch (rosterErr) {
      console.warn('[Roster Sync Warning] Failed to update roster isRegistered:', rosterErr.message);
    }
  }

  res.status(201).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      college: user.college,
      department: user.department,
      rollNumber: user.rollNumber,
      enrolmentNo: user.enrolmentNo,
      enrolledSubjects: user.enrolledSubjects,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  });
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() })
    .select('+password')
    .populate('college', 'name code address')
    .populate('department', 'name code');

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error('Your account has been deactivated. Please contact your administrator.');
  }

  generateToken(user._id, res);

  res.status(200).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      college: user.college,
      department: user.department,
      rollNumber: user.rollNumber,
      enrolmentNo: user.enrolmentNo,
      assignedSubjects: user.assignedSubjects || [],
      enrolledSubjects: user.enrolledSubjects || [],
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  });
});

// @desc    Log user out & clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logout = asyncHandler(async (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('jwt', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? (process.env.COOKIE_SAME_SITE || 'none') : 'lax',
    expires: new Date(0)
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('college', 'name code address')
    .populate('department', 'name code');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Get Google OAuth client configuration
// @route   GET /api/auth/google/config
// @access  Public
const getGoogleConfig = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    clientId: (process.env.GOOGLE_CLIENT_ID || '').trim()
  });
});

// @desc    Authenticate with Google OAuth ID Token
// @route   POST /api/auth/google
// @access  Public
const googleLogin = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    res.status(400);
    throw new Error('Google credential token is required');
  }

  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  let googleEmail = null;
  let googleName = null;

  try {
    if (clientId) {
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      const payload = ticket.getPayload();

      if (!payload || !payload.email_verified) {
        res.status(403);
        throw new Error('Google email is not verified by Google');
      }

      googleEmail = (payload.email || '').toLowerCase().trim();
      googleName = payload.name;
    } else {
      // In development or when GOOGLE_CLIENT_ID is not configured yet,
      // decode token to extract payload safely
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(credential);
      if (!decoded || !decoded.email) {
        res.status(400);
        throw new Error('Invalid Google credential token');
      }
      if (decoded.email_verified === false) {
        res.status(403);
        throw new Error('Google email is not verified by Google');
      }
      googleEmail = (decoded.email || '').toLowerCase().trim();
      googleName = decoded.name;
    }
  } catch (err) {
    res.status(401);
    throw new Error(`Google token verification failed: ${err.message}`);
  }

  if (!googleEmail) {
    res.status(400);
    throw new Error('Could not retrieve email from Google credential');
  }

  // 1. Check if user already exists in User collection
  let user = await User.findOne({ email: googleEmail })
    .populate('college', 'name code address')
    .populate('department', 'name code');

  if (user) {
    if (!user.isActive) {
      user.isActive = true;
      await user.save();
    }
    generateToken(user._id, res);
    return res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        college: user.college,
        department: user.department,
        rollNumber: user.rollNumber,
        enrolmentNo: user.enrolmentNo,
        assignedSubjects: user.assignedSubjects || [],
        enrolledSubjects: user.enrolledSubjects || [],
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  }

  // 2. User does not exist yet. Check if email is pre-registered in official StudentRoster
  const rosterEntry = await StudentRoster.findOne({ email: googleEmail })
    .populate('college')
    .populate('department');

  if (rosterEntry) {
    // Determine enrolled subjects if department is specified
    let enrolledSubjects = [];
    let deptId = rosterEntry.department?._id || rosterEntry.department || null;

    if (deptId) {
      const dept = await Department.findById(deptId);
      if (dept && dept.subjects) {
        enrolledSubjects = dept.subjects.map((s) => s.code);
      }
    }

    const randomPassword = 'G-' + Math.random().toString(36).substring(2, 12) + '!' + Date.now();
    user = await User.create({
      name: rosterEntry.name || googleName || 'Student',
      email: googleEmail,
      password: randomPassword,
      role: 'student',
      college: rosterEntry.college?._id || rosterEntry.college,
      department: deptId,
      rollNumber: rosterEntry.enrolmentNo,
      enrolmentNo: rosterEntry.enrolmentNo,
      enrolledSubjects,
      isActive: true
    });

    // Mark roster entry as registered
    rosterEntry.isRegistered = true;
    await rosterEntry.save();

    await user.populate('college', 'name code address');
    if (user.department) await user.populate('department', 'name code');

    generateToken(user._id, res);

    return res.status(201).json({
      success: true,
      message: `Welcome ${user.name}! Your student profile has been automatically verified and activated from the college roster.`,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        college: user.college,
        department: user.department,
        rollNumber: user.rollNumber,
        enrolmentNo: user.enrolmentNo,
        assignedSubjects: user.assignedSubjects || [],
        enrolledSubjects: user.enrolledSubjects || [],
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  }

  // 3. Not in User and not in StudentRoster: Deny access!
  return res.status(403).json({
    success: false,
    message: `Access denied. Google account "${googleEmail}" is not found in any college student roster or faculty registry. Please ask your College Administrator to add your email to the roster first.`
  });
});

module.exports = {
  getCollegeBranches,
  verifyStudentEmail,
  getGoogleConfig,
  googleLogin,
  register,
  login,
  logout,
  getMe
};
