const asyncHandler = require('express-async-handler');
const Issue = require('../models/Issue');
const Sheet = require('../models/Sheet');
const Batch = require('../models/Batch');
const User = require('../models/User');
const { sendEmail } = require('../utils/emailService');
const { logAudit } = require('../utils/auditLogger');

// @desc    Raise a new grievance / issue on an evaluated sheet or subject
// @route   POST /api/issues
// @access  Private (student)
const createIssue = asyncHandler(async (req, res) => {
  const { subjectCode, issueType, description, sheetId } = req.body;

  if (!subjectCode || !description) {
    res.status(400);
    throw new Error('Subject code and issue description are required');
  }

  const rollNumber = req.user.rollNumber;
  if (!rollNumber) {
    res.status(400);
    throw new Error('Student profile has no enrolled Roll Number');
  }

  // Find sheet and batch if sheetId given or lookup by roll & subject
  let targetSheet = null;
  let targetBatch = null;

  if (sheetId) {
    targetSheet = await Sheet.findById(sheetId).populate('batch');
    if (targetSheet) {
      targetBatch = targetSheet.batch;
    }
  }

  if (!targetSheet) {
    // Lookup matching published batch with this subjectCode in student's college
    const batches = await Batch.find({
      college: req.user.college,
      subjectCode: subjectCode.toUpperCase().trim(),
      status: 'published'
    });

    const batchIds = batches.map((b) => b._id);
    targetSheet = await Sheet.findOne({
      batch: { $in: batchIds },
      enrolment: rollNumber.toUpperCase().trim()
    }).populate('batch');

    if (targetSheet) {
      targetBatch = targetSheet.batch;
    }
  }

  const issue = await Issue.create({
    student: req.user._id,
    studentRoll: rollNumber.toUpperCase().trim(),
    teacher: targetBatch?.teacher || null,
    college: req.user.college,
    batch: targetBatch?._id || null,
    sheet: targetSheet?._id || null,
    subjectCode: subjectCode.toUpperCase().trim(),
    issueType: issueType || 'marks_mismatch',
    description: description.trim(),
    status: 'pending'
  });

  const populated = await Issue.findById(issue._id)
    .populate('student', 'name email rollNumber')
    .populate('teacher', 'name email')
    .populate('sheet', 'totalMarks statusLabel enrolment');

  // Trigger 1: Safe email notification to teacher
  if (populated.teacher && populated.teacher.email) {
    sendEmail({
      to: populated.teacher.email,
      subject: `[ExamScanWeb] New Grievance Raised: ${populated.subjectCode} (Roll: ${populated.studentRoll})`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #4f46e5; margin-top: 0;">New Student Grievance Submitted</h2>
          <p>A student has raised an issue regarding an evaluated exam paper.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 6px 0; color: #64748b;"><strong>Student Name:</strong></td><td>${populated.student?.name || 'N/A'}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;"><strong>Roll / Enrolment No:</strong></td><td>${populated.studentRoll}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;"><strong>Subject Code:</strong></td><td>${populated.subjectCode}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;"><strong>Issue Type:</strong></td><td>${populated.issueType}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;"><strong>Description:</strong></td><td>${populated.description}</td></tr>
          </table>
          <p style="margin-top: 20px;">Please log in to your Teacher Portal to review and resolve this grievance.</p>
        </div>
      `
    }).catch(err => console.error('[createIssue Email Error]', err));
  }

  res.status(201).json({
    success: true,
    data: populated
  });
});

// @desc    Get issues submitted by logged-in student
// @route   GET /api/issues/my
// @access  Private (student)
const getStudentIssues = asyncHandler(async (req, res) => {
  const issues = await Issue.find({ student: req.user._id })
    .populate('teacher', 'name email')
    .populate('sheet', 'totalMarks statusLabel enrolment')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: issues.length,
    data: issues
  });
});

// @desc    Get issues assigned to teacher's batches
// @route   GET /api/issues/teacher
// @access  Private (teacher, college_admin, super_admin)
const getTeacherIssues = asyncHandler(async (req, res) => {
  let filter = {};
  if (req.user.role === 'teacher') {
    filter = {
      $or: [
        { teacher: req.user._id },
        { college: req.user.college }
      ]
    };
  } else if (req.user.role === 'college_admin') {
    filter = { college: req.user.college };
  }

  const issues = await Issue.find(filter)
    .populate('student', 'name email rollNumber')
    .populate('sheet', 'totalMarks statusLabel enrolment q1 q2 q3 q4 q5')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: issues.length,
    data: issues
  });
});

// @desc    Update / Resolve student issue
// @route   PUT /api/issues/:id
// @access  Private (teacher, college_admin, super_admin)
const updateIssue = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) {
    res.status(404);
    throw new Error('Issue not found');
  }

  const { status, teacherResponse } = req.body;
  const oldStatus = issue.status;

  if (status) {
    issue.status = status;
    if (status === 'resolved' || status === 'rejected') {
      issue.resolvedAt = new Date();
    }
  }

  if (teacherResponse !== undefined) {
    issue.teacherResponse = teacherResponse.trim();
  }

  await issue.save();

  await logAudit({
    action: 'GRIEVANCE_UPDATED',
    actor: req.user._id,
    actorRole: req.user.role,
    college: req.user.college || issue.college,
    target: 'Issue',
    targetId: issue._id,
    detail: `Grievance status changed to ${issue.status} by ${req.user.name}`,
    before: { status: oldStatus },
    after: { status: issue.status, teacherResponse: issue.teacherResponse }
  });

  const populated = await Issue.findById(issue._id)
    .populate('student', 'name email rollNumber')
    .populate('teacher', 'name email')
    .populate('sheet', 'totalMarks statusLabel enrolment');

  // Trigger 2: Safe email notification to student when resolved or rejected
  if ((status === 'resolved' || status === 'rejected') && populated.student && populated.student.email) {
    sendEmail({
      to: populated.student.email,
      subject: `[ExamScanWeb] Grievance Update: ${populated.subjectCode} - ${status.toUpperCase()}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: ${status === 'resolved' ? '#16a34a' : '#dc2626'}; margin-top: 0;">Grievance Status: ${status.toUpperCase()}</h2>
          <p>Dear ${populated.student.name || 'Student'},</p>
          <p>Your grievance regarding subject <strong>${populated.subjectCode}</strong> has been updated by the faculty.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 6px 0; color: #64748b;"><strong>Status:</strong></td><td style="font-weight: bold; text-transform: capitalize;">${status}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;"><strong>Teacher Response:</strong></td><td>${populated.teacherResponse || 'None provided'}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;"><strong>Updated At:</strong></td><td>${new Date().toLocaleString()}</td></tr>
          </table>
          <p>You can view full details in your Student Portal.</p>
        </div>
      `
    }).catch(err => console.error('[updateIssue Email Error]', err));
  }

  res.status(200).json({
    success: true,
    data: populated
  });
});

module.exports = {
  createIssue,
  getStudentIssues,
  getTeacherIssues,
  updateIssue
};
