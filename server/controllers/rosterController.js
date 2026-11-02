const asyncHandler = require('express-async-handler');
const { parse } = require('csv-parse/sync');
const StudentRoster = require('../models/StudentRoster');
const Department = require('../models/Department');
const User = require('../models/User');

// @desc    Import student roster via CSV upload
// @route   POST /api/admin/roster/import
// @access  Private (college_admin, super_admin)
const importStudentCSV = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    res.status(400);
    throw new Error('Please upload a valid CSV file');
  }

  const collegeId = req.user.role === 'super_admin' ? (req.body.college || req.user.college) : req.user.college;
  if (!collegeId) {
    res.status(400);
    throw new Error('College reference is missing');
  }

  // Pre-fetch all departments for this college
  const departments = await Department.find({ college: collegeId });
  const deptMap = {};
  departments.forEach((dept) => {
    if (dept.code) deptMap[dept.code.trim().toUpperCase()] = dept._id;
    if (dept.name) deptMap[dept.name.trim().toUpperCase()] = dept._id;
  });

  // Optional fallback department from request body or first department
  const fallbackDeptId = req.body.department || (departments.length > 0 ? departments[0]._id : null);

  let records = [];
  try {
    records = parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
  } catch (err) {
    res.status(400);
    throw new Error(`CSV parsing error: ${err.message}`);
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < records.length; i++) {
    const rawRow = records[i];
    // Normalize keys to lowercase without spaces or punctuation
    const row = {};
    Object.keys(rawRow).forEach((k) => {
      const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      row[cleanKey] = (rawRow[k] || '').trim();
    });

    const enrolmentNo = (
      row.enrolmentno ||
      row.enrollmentno ||
      row.enrolment ||
      row.enrollment ||
      row.rollno ||
      row.rollnumber ||
      row.roll ||
      row.id ||
      ''
    ).toUpperCase();

    const name = row.name || row.studentname || row.student || '';
    const email = (row.email || row.studentemail || row.mail || '').toLowerCase().trim();
    const deptRaw = (row.department || row.branch || row.dept || '').toUpperCase();
    const session = row.session || row.academicsession || row.year || req.body.session || '';

    // Skip empty enrolment rows
    if (!enrolmentNo) {
      skipped++;
      continue;
    }

    // Resolve department (if department column present in CSV use that, else fallback to selected department)
    let deptId = null;
    if (deptRaw) {
      deptId = deptMap[deptRaw] || null;
      if (!deptId) {
        // Log note but don't drop row if fallback available
        deptId = fallbackDeptId;
      }
    } else {
      deptId = fallbackDeptId;
    }

    try {
      // Check if student user is already registered in the system
      const existingStudent = await User.findOne({
        college: collegeId,
        role: 'student',
        $or: [{ enrolmentNo }, { rollNumber: enrolmentNo }]
      });

      const isRegistered = !!existingStudent;

      const updateData = {
        name,
        email,
        session,
        isRegistered
      };

      if (deptId) {
        updateData.department = deptId;
      }

      const resUpdate = await StudentRoster.updateOne(
        { enrolmentNo, college: collegeId },
        { $set: updateData },
        { upsert: true }
      );

      if (resUpdate.upsertedCount > 0) {
        inserted++;
      } else {
        updated++;
      }
    } catch (dbErr) {
      errors.push({
        row: i + 2,
        enrolmentNo,
        error: dbErr.message
      });
    }
  }

  res.status(200).json({
    success: true,
    data: {
      inserted,
      updated,
      skipped,
      errors
    }
  });
});

// @desc    Get student roster for college with optional filters
// @route   GET /api/admin/roster
// @access  Private (college_admin, super_admin)
const getRoster = asyncHandler(async (req, res) => {
  const collegeId = req.user.role === 'super_admin' ? (req.query.college || req.user.college) : req.user.college;
  const filter = { college: collegeId };

  if (req.query.department) {
    filter.department = req.query.department;
  }
  if (req.query.session) {
    filter.session = req.query.session;
  }

  const roster = await StudentRoster.find(filter)
    .populate('department', 'name code')
    .sort({ enrolmentNo: 1 });

  res.status(200).json({
    success: true,
    count: roster.length,
    data: roster
  });
});

// @desc    Delete a single student roster entry
// @route   DELETE /api/admin/roster/:id
// @access  Private (college_admin, super_admin)
const deleteRosterEntry = asyncHandler(async (req, res) => {
  const entry = await StudentRoster.findById(req.params.id);
  if (!entry) {
    res.status(404);
    throw new Error('Roster entry not found');
  }

  if (req.user.role !== 'super_admin' && entry.college.toString() !== req.user.college.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this roster entry');
  }

  await StudentRoster.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Roster entry removed successfully'
  });
});

module.exports = {
  importStudentCSV,
  getRoster,
  deleteRosterEntry
};
