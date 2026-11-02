const asyncHandler = require('express-async-handler');
const AccessRequest = require('../models/AccessRequest');
const StudentRoster = require('../models/StudentRoster');
const College = require('../models/College');
const Department = require('../models/Department');
const AuditLog = require('../models/AuditLog');

// @desc    Submit a new access / roster dispute request (Public)
// @route   POST /api/access-requests
// @access  Public
const submitAccessRequest = asyncHandler(async (req, res) => {
  const {
    collegeCode,
    name,
    enrolmentNo,
    email,
    departmentId,
    departmentName,
    requestType = 'missing_roster',
    reason = ''
  } = req.body;

  if (!collegeCode || !name || !enrolmentNo || !email) {
    res.status(400);
    throw new Error('College code, student name, enrolment number, and email are required');
  }

  const college = await College.findOne({ code: collegeCode.toUpperCase().trim() });
  if (!college) {
    res.status(404);
    throw new Error('College not found with the provided code');
  }

  const cleanRoll = enrolmentNo.toUpperCase().trim();
  const cleanEmail = email.toLowerCase().trim();

  // Check if a pending request already exists for this roll number and college
  let existingRequest = await AccessRequest.findOne({
    college: college._id,
    enrolmentNo: cleanRoll,
    status: 'pending'
  });

  if (existingRequest) {
    // Update existing pending request
    existingRequest.name = name.trim();
    existingRequest.email = cleanEmail;
    existingRequest.department = departmentId || existingRequest.department;
    existingRequest.departmentName = departmentName || existingRequest.departmentName;
    existingRequest.requestType = requestType;
    existingRequest.reason = reason.trim();
    await existingRequest.save();

    return res.status(200).json({
      success: true,
      message: 'Your existing pending access request has been updated. The College Administrator has been notified.',
      data: existingRequest
    });
  }

  // Create new AccessRequest
  const newRequest = await AccessRequest.create({
    college: college._id,
    name: name.trim(),
    enrolmentNo: cleanRoll,
    email: cleanEmail,
    department: departmentId || null,
    departmentName: departmentName || '',
    requestType,
    reason: reason.trim(),
    status: 'pending'
  });

  res.status(201).json({
    success: true,
    message: 'Access request submitted successfully! Your College Administrator will review and update your roster record.',
    data: newRequest
  });
});

// @desc    Check status of an access request (Public)
// @route   GET /api/access-requests/status
// @access  Public
const checkRequestStatus = asyncHandler(async (req, res) => {
  const { collegeCode, enrolmentNo, email } = req.query;

  if (!collegeCode || (!enrolmentNo && !email)) {
    res.status(400);
    throw new Error('College code and either enrolment number or email are required');
  }

  const college = await College.findOne({ code: collegeCode.toUpperCase().trim() });
  if (!college) {
    res.status(404);
    throw new Error('College not found');
  }

  const query = { college: college._id };
  if (enrolmentNo) query.enrolmentNo = enrolmentNo.toUpperCase().trim();
  if (email) query.email = email.toLowerCase().trim();

  const requests = await AccessRequest.find(query)
    .populate('department', 'name code')
    .sort({ createdAt: -1 })
    .limit(5);

  res.status(200).json({
    success: true,
    data: requests
  });
});

// @desc    Get all access requests for college admin
// @route   GET /api/admin/access-requests
// @access  Private (college_admin, super_admin)
const getCollegeAccessRequests = asyncHandler(async (req, res) => {
  const collegeId = req.user.role === 'super_admin' ? (req.query.college || req.user.college) : req.user.college;
  if (!collegeId) {
    res.status(400);
    throw new Error('College identifier is required');
  }

  const { status, search } = req.query;
  const filter = { college: collegeId };

  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    filter.status = status;
  }

  if (search) {
    const term = search.trim();
    filter.$or = [
      { name: { $regex: term, $options: 'i' } },
      { enrolmentNo: { $regex: term, $options: 'i' } },
      { email: { $regex: term, $options: 'i' } }
    ];
  }

  const requests = await AccessRequest.find(filter)
    .populate('department', 'name code')
    .populate('resolvedBy', 'name email')
    .sort({ createdAt: -1 });

  const pendingCount = await AccessRequest.countDocuments({ college: collegeId, status: 'pending' });

  res.status(200).json({
    success: true,
    data: requests,
    pendingCount
  });
});

// @desc    Approve access request & auto-sync StudentRoster
// @route   PATCH /api/admin/access-requests/:id/approve
// @access  Private (college_admin, super_admin)
const approveAccessRequest = asyncHandler(async (req, res) => {
  const collegeId = req.user.role === 'super_admin' ? (req.body.college || req.user.college) : req.user.college;
  const request = await AccessRequest.findOne({ _id: req.params.id, college: collegeId });

  if (!request) {
    res.status(404);
    throw new Error('Access request not found');
  }

  if (request.status === 'approved') {
    res.status(400);
    throw new Error('This request has already been approved');
  }

  const { adminRemarks = '', departmentId } = req.body;
  const finalDeptId = departmentId || request.department;

  // 1. Update AccessRequest status
  request.status = 'approved';
  request.adminRemarks = adminRemarks;
  request.resolvedBy = req.user._id;
  request.resolvedAt = new Date();
  if (finalDeptId) request.department = finalDeptId;
  await request.save();

  // 2. Auto-create or update StudentRoster entry so student can now register or use Google login
  const rosterUpdate = {
    name: request.name,
    email: request.email.toLowerCase().trim(),
    session: '2023-24'
  };
  if (finalDeptId) {
    rosterUpdate.department = finalDeptId;
  }

  await StudentRoster.updateOne(
    { enrolmentNo: request.enrolmentNo, college: collegeId },
    { $set: rosterUpdate },
    { upsert: true }
  );

  // 3. Log to AuditLog
  try {
    await AuditLog.create({
      college: collegeId,
      action: 'APPROVE_ACCESS_REQUEST',
      target: 'AccessRequest',
      targetId: request._id,
      user: req.user._id,
      details: {
        enrolmentNo: request.enrolmentNo,
        email: request.email,
        name: request.name,
        adminRemarks
      }
    });
  } catch (auditErr) {
    console.warn('[AuditLog Warning]', auditErr.message);
  }

  res.status(200).json({
    success: true,
    message: `Access request approved for ${request.name} (${request.enrolmentNo}). Student roster has been updated and student can now register or sign in.`,
    data: request
  });
});

// @desc    Reject access request
// @route   PATCH /api/admin/access-requests/:id/reject
// @access  Private (college_admin, super_admin)
const rejectAccessRequest = asyncHandler(async (req, res) => {
  const collegeId = req.user.role === 'super_admin' ? (req.body.college || req.user.college) : req.user.college;
  const request = await AccessRequest.findOne({ _id: req.params.id, college: collegeId });

  if (!request) {
    res.status(404);
    throw new Error('Access request not found');
  }

  const { adminRemarks = 'Request denied by College Administrator.' } = req.body;

  request.status = 'rejected';
  request.adminRemarks = adminRemarks;
  request.resolvedBy = req.user._id;
  request.resolvedAt = new Date();
  await request.save();

  // Log to AuditLog
  try {
    await AuditLog.create({
      college: collegeId,
      action: 'REJECT_ACCESS_REQUEST',
      target: 'AccessRequest',
      targetId: request._id,
      user: req.user._id,
      details: {
        enrolmentNo: request.enrolmentNo,
        email: request.email,
        name: request.name,
        adminRemarks
      }
    });
  } catch (auditErr) {
    console.warn('[AuditLog Warning]', auditErr.message);
  }

  res.status(200).json({
    success: true,
    message: `Access request rejected for ${request.enrolmentNo}.`,
    data: request
  });
});

module.exports = {
  submitAccessRequest,
  checkRequestStatus,
  getCollegeAccessRequests,
  approveAccessRequest,
  rejectAccessRequest
};
