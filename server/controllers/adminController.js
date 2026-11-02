const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const College = require('../models/College');
const Department = require('../models/Department');
const Batch = require('../models/Batch');
const Sheet = require('../models/Sheet');
const Issue = require('../models/Issue');
const AuditLog = require('../models/AuditLog');

// @desc    Get dashboard metrics for College Admin or Super Admin
// @route   GET /api/admin/stats
// @access  Private (college_admin, super_admin)
const getAdminStats = asyncHandler(async (req, res) => {
  const isSuper = req.user.role === 'super_admin';
  const collegeId = isSuper ? (req.query.college ? req.query.college : null) : req.user.college;

  if (isSuper && !collegeId) {
    const totalColleges = await College.countDocuments();
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const totalBatches = await Batch.countDocuments();
    const publishedBatches = await Batch.countDocuments({ status: 'published' });
    const totalSheets = await Sheet.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const openGrievances = await Issue.countDocuments({ status: { $in: ['pending', 'in_review'] } });

    // Aggregate global department stats across all published batches
    const deptStats = await Batch.aggregate([
      {
        $group: {
          _id: '$subjectCode',
          totalBatches: { $sum: 1 },
          publishedBatches: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
          totalSheets: { $sum: '$totalSheets' },
          avgCO1: { $avg: '$coAttainment.co1.attainmentLevel' },
          avgCO2: { $avg: '$coAttainment.co2.attainmentLevel' },
          avgCO3: { $avg: '$coAttainment.co3.attainmentLevel' },
          avgCO4: { $avg: '$coAttainment.co4.attainmentLevel' },
          avgCO5: { $avg: '$coAttainment.co5.attainmentLevel' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalColleges,
        totalTeachers,
        totalBatches,
        publishedBatches,
        totalSheets,
        totalStudents,
        openGrievances,
        deptStats
      }
    });
  }

  // College Admin Stats (or Super Admin inspecting a specific college)
  const totalTeachers = await User.countDocuments({ role: 'teacher', college: collegeId });
  const totalBatches = await Batch.countDocuments({ college: collegeId });
  const publishedBatches = await Batch.countDocuments({ college: collegeId, status: 'published' });
  const totalDepartments = await Department.countDocuments({ college: collegeId });

  const batchIds = (await Batch.find({ college: collegeId }).select('_id')).map((b) => b._id);
  const totalSheets = await Sheet.countDocuments({ batch: { $in: batchIds } });

  // 1. Per-department / per-subject batch count and attainment levels
  const deptStats = await Batch.aggregate([
    { $match: { college: collegeId } },
    {
      $group: {
        _id: '$subjectCode',
        totalBatches: { $sum: 1 },
        publishedBatches: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
        totalSheets: { $sum: '$totalSheets' },
        avgCO1: { $avg: '$coAttainment.co1.attainmentLevel' },
        avgCO2: { $avg: '$coAttainment.co2.attainmentLevel' },
        avgCO3: { $avg: '$coAttainment.co3.attainmentLevel' },
        avgCO4: { $avg: '$coAttainment.co4.attainmentLevel' },
        avgCO5: { $avg: '$coAttainment.co5.attainmentLevel' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // 2. Open grievances count
  const openGrievances = await Issue.countDocuments({
    college: collegeId,
    status: { $in: ['pending', 'in_review'] }
  });

  // 3. Total students registered
  const totalStudents = await User.countDocuments({
    college: collegeId,
    role: 'student'
  });

  res.status(200).json({
    success: true,
    data: {
      totalTeachers,
      totalBatches,
      publishedBatches,
      totalDepartments,
      totalSheets,
      totalStudents,
      openGrievances,
      deptStats
    }
  });
});

// @desc    Update College Details (name, address, code)
// @route   PUT /api/admin/college
// @access  Private (college_admin, super_admin)
const updateCollege = asyncHandler(async (req, res) => {
  const collegeId = req.body.collegeId || req.user.college;
  if (!collegeId) {
    res.status(400);
    throw new Error('College not found');
  }

  const college = await College.findById(collegeId);
  if (!college) {
    res.status(404);
    throw new Error('College not found');
  }

  const { name, code, address } = req.body;
  if (name !== undefined) college.name = name.trim();
  if (address !== undefined) college.address = address.trim();
  if (code !== undefined) {
    const normalized = code.toUpperCase().trim();
    if (normalized !== college.code) {
      const existing = await College.findOne({ code: normalized });
      if (existing) {
        res.status(400);
        throw new Error('College code already in use');
      }
      college.code = normalized;
    }
  }

  await college.save();

  res.status(200).json({
    success: true,
    data: college
  });
});

// @desc    Get list of departments for the college
// @route   GET /api/admin/departments
// @access  Private (college_admin, super_admin, teacher)
const getDepartments = asyncHandler(async (req, res) => {
  const collegeId = req.query.collegeId || req.user.college;
  if (!collegeId) {
    return res.status(200).json({ success: true, count: 0, data: [] });
  }

  const departments = await Department.find({ college: collegeId }).sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: departments.length,
    data: departments
  });
});

// @desc    Create a new department / branch
// @route   POST /api/admin/departments
// @access  Private (college_admin, super_admin)
const createDepartment = asyncHandler(async (req, res) => {
  const collegeId = req.body.collegeId || req.user.college;
  const { name, code } = req.body;

  if (!name || !code) {
    res.status(400);
    throw new Error('Department name and code are required');
  }

  const normalizedCode = code.toUpperCase().trim();
  const existing = await Department.findOne({ college: collegeId, code: normalizedCode });
  if (existing) {
    res.status(400);
    throw new Error('A department with this code already exists in your college');
  }

  const dept = await Department.create({
    name: name.trim(),
    code: normalizedCode,
    college: collegeId,
    subjects: []
  });

  res.status(201).json({
    success: true,
    data: dept
  });
});

// @desc    Update department name or code
// @route   PUT /api/admin/departments/:id
// @access  Private (college_admin, super_admin)
const updateDepartment = asyncHandler(async (req, res) => {
  const collegeId = req.user.role === 'super_admin' ? req.body.collegeId : req.user.college;
  const filter = { _id: req.params.id };
  if (collegeId) filter.college = collegeId;

  const dept = await Department.findOne(filter);
  if (!dept) {
    res.status(404);
    throw new Error('Department not found');
  }

  const { name, code } = req.body;
  if (name !== undefined) dept.name = name.trim();
  if (code !== undefined) {
    const normalized = code.toUpperCase().trim();
    if (normalized !== dept.code) {
      const existing = await Department.findOne({ college: dept.college, code: normalized });
      if (existing) {
        res.status(400);
        throw new Error('Department code already in use');
      }
      dept.code = normalized;
    }
  }

  await dept.save();

  res.status(200).json({
    success: true,
    data: dept
  });
});

// @desc    Delete department
// @route   DELETE /api/admin/departments/:id
// @access  Private (college_admin, super_admin)
const deleteDepartment = asyncHandler(async (req, res) => {
  const collegeId = req.user.role === 'super_admin' ? req.body.collegeId : req.user.college;
  const filter = { _id: req.params.id };
  if (collegeId) filter.college = collegeId;

  const dept = await Department.findOne(filter);
  if (!dept) {
    res.status(404);
    throw new Error('Department not found');
  }

  await Department.deleteOne({ _id: dept._id });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Add subject under a department
// @route   POST /api/admin/departments/:deptId/subjects
// @access  Private (college_admin, super_admin)
const addSubject = asyncHandler(async (req, res) => {
  const dept = await Department.findById(req.params.deptId);
  if (!dept) {
    res.status(404);
    throw new Error('Department not found');
  }

  const { name, code } = req.body;
  if (!name || !code) {
    res.status(400);
    throw new Error('Subject name and code are required');
  }

  const normalizedCode = code.toUpperCase().trim();
  const exists = dept.subjects.some((s) => s.code === normalizedCode);
  if (exists) {
    res.status(400);
    throw new Error('Subject code already exists in this department');
  }

  dept.subjects.push({
    name: name.trim(),
    code: normalizedCode
  });

  await dept.save();

  res.status(201).json({
    success: true,
    data: dept
  });
});

// @desc    Update subject under a department
// @route   PUT /api/admin/departments/:deptId/subjects/:subId
// @access  Private (college_admin, super_admin)
const updateSubject = asyncHandler(async (req, res) => {
  const dept = await Department.findById(req.params.deptId);
  if (!dept) {
    res.status(404);
    throw new Error('Department not found');
  }

  const subject = dept.subjects.id(req.params.subId);
  if (!subject) {
    res.status(404);
    throw new Error('Subject not found');
  }

  const { name, code } = req.body;
  if (name !== undefined) subject.name = name.trim();
  if (code !== undefined) subject.code = code.toUpperCase().trim();

  await dept.save();

  res.status(200).json({
    success: true,
    data: dept
  });
});

// @desc    Delete subject from department
// @route   DELETE /api/admin/departments/:deptId/subjects/:subId
// @access  Private (college_admin, super_admin)
const deleteSubject = asyncHandler(async (req, res) => {
  const dept = await Department.findById(req.params.deptId);
  if (!dept) {
    res.status(404);
    throw new Error('Department not found');
  }

  dept.subjects = dept.subjects.filter((s) => s._id.toString() !== req.params.subId);
  await dept.save();

  res.status(200).json({
    success: true,
    data: dept
  });
});

// @desc    Get list of teachers for the college
// @route   GET /api/admin/teachers
// @access  Private (college_admin, super_admin)
const getTeachers = asyncHandler(async (req, res) => {
  const isSuper = req.user.role === 'super_admin';
  const filter = { role: 'teacher' };

  if (!isSuper) {
    filter.college = req.user.college;
  }

  const teachers = await User.find(filter)
    .populate('college', 'name code')
    .populate('department', 'name code')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: teachers.length,
    data: teachers
  });
});

// @desc    Register a new teacher under the college
// @route   POST /api/admin/teachers
// @access  Private (college_admin, super_admin)
const createTeacher = asyncHandler(async (req, res) => {
  const { name, email, password, departmentId, assignedSubjects = [] } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Please provide name, email, and password');
  }

  const userExists = await User.findOne({ email: email.toLowerCase().trim() });
  if (userExists) {
    res.status(400);
    throw new Error('A user with this email already exists');
  }

  let collegeId = req.user.college;
  if (req.user.role === 'super_admin') {
    collegeId = req.body.collegeId || null;
    if (!collegeId) {
      res.status(400);
      throw new Error('Super admin must specify a college ID for the teacher');
    }
  }

  const teacher = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    role: 'teacher',
    college: collegeId,
    department: departmentId || null,
    assignedSubjects: assignedSubjects.map((s) => s.toUpperCase().trim())
  });

  res.status(201).json({
    success: true,
    data: {
      _id: teacher._id,
      name: teacher.name,
      email: teacher.email,
      role: teacher.role,
      college: teacher.college,
      department: teacher.department,
      assignedSubjects: teacher.assignedSubjects,
      isActive: teacher.isActive
    }
  });
});

// @desc    Assign teacher to department and subjects
// @route   PUT /api/admin/teachers/:teacherId/assign
// @access  Private (college_admin, super_admin)
const assignTeacher = asyncHandler(async (req, res) => {
  const teacher = await User.findById(req.params.teacherId);
  if (!teacher || teacher.role !== 'teacher') {
    res.status(404);
    throw new Error('Teacher not found');
  }

  if (req.user.role === 'college_admin' && String(teacher.college) !== String(req.user.college)) {
    res.status(403);
    throw new Error('You can only assign teachers in your college');
  }

  const { departmentId, assignedSubjects = [] } = req.body;
  if (departmentId) {
    teacher.department = departmentId;
  }
  teacher.assignedSubjects = assignedSubjects.map((s) => s.toUpperCase().trim());

  await teacher.save();

  const populated = await User.findById(teacher._id)
    .populate('department', 'name code')
    .populate('college', 'name code');

  res.status(200).json({
    success: true,
    data: populated
  });
});

// @desc    Get all colleges (Super Admin)
// @route   GET /api/admin/colleges
// @access  Private (super_admin)
const getColleges = asyncHandler(async (req, res) => {
  const colleges = await College.find().sort({ name: 1 });

  const collegesWithCounts = await Promise.all(
    colleges.map(async (col) => {
      const teacherCount = await User.countDocuments({ role: 'teacher', college: col._id });
      const batchCount = await Batch.countDocuments({ college: col._id });
      const departmentCount = await Department.countDocuments({ college: col._id });
      return {
        ...col.toObject(),
        teacherCount,
        batchCount,
        departmentCount
      };
    })
  );

  res.status(200).json({
    success: true,
    count: collegesWithCounts.length,
    data: collegesWithCounts
  });
});

// @desc    Create a new college (Super Admin)
// @route   POST /api/admin/colleges
// @access  Private (super_admin)
const createCollege = asyncHandler(async (req, res) => {
  const { name, code, address } = req.body;

  if (!name || !code) {
    res.status(400);
    throw new Error('College name and unique code are required');
  }

  const existing = await College.findOne({ code: code.toUpperCase().trim() });
  if (existing) {
    res.status(400);
    throw new Error('A college with this code already exists');
  }

  const college = await College.create({
    name: name.trim(),
    code: code.toUpperCase().trim(),
    address: address ? address.trim() : ''
  });

  res.status(201).json({
    success: true,
    data: college
  });
});

// @desc    Delete a college (Super Admin)
// @route   DELETE /api/admin/colleges/:id
// @access  Private (super_admin)
const deleteCollege = asyncHandler(async (req, res) => {
  const college = await College.findById(req.params.id);
  if (!college) {
    res.status(404);
    throw new Error('College not found');
  }

  await College.deleteOne({ _id: college._id });
  await Department.deleteMany({ college: college._id });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Delete a teacher from college
// @route   DELETE /api/admin/teachers/:id
// @access  Private (college_admin, super_admin)
const deleteTeacher = asyncHandler(async (req, res) => {
  const teacher = await User.findById(req.params.id);
  if (!teacher || teacher.role !== 'teacher') {
    res.status(404);
    throw new Error('Teacher not found');
  }

  if (req.user.role === 'college_admin' && String(teacher.college) !== String(req.user.college)) {
    res.status(403);
    throw new Error('Not authorized to delete teachers outside your college');
  }

  await User.deleteOne({ _id: teacher._id });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get audit trail logs
// @route   GET /api/admin/audit
// @access  Private (college_admin, super_admin)
const getAuditLogs = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role !== 'super_admin' || req.user.college) {
    filter.college = req.user.college;
  }
  if (req.query.college && req.user.role === 'super_admin') {
    filter.college = req.query.college;
  }
  if (req.query.target) {
    filter.target = req.query.target;
  }
  if (req.query.targetId) {
    filter.targetId = req.query.targetId;
  }

  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

  const logs = await AuditLog.find(filter)
    .populate('actor', 'name email role')
    .sort({ createdAt: -1 })
    .limit(limit);

  res.status(200).json({
    success: true,
    count: logs.length,
    data: logs
  });
});

module.exports = {
  getAdminStats,
  updateCollege,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  addSubject,
  updateSubject,
  deleteSubject,
  getTeachers,
  createTeacher,
  assignTeacher,
  deleteTeacher,
  getColleges,
  createCollege,
  deleteCollege,
  getAuditLogs
};
