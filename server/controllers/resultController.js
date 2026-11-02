const asyncHandler = require('express-async-handler');
const Batch = require('../models/Batch');
const Sheet = require('../models/Sheet');

// @desc    Look up published exam results by student roll number / enrolment
// @route   GET /api/results/lookup
// @access  Private (Authentication required - Students can only access their own results)
const lookupResults = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Authentication required to access examination marks. Please log in.');
  }

  let targetEnrolment = '';

  // If user is a student, restrict strictly to their own enrolment/rollNumber
  if (req.user.role === 'student') {
    targetEnrolment = (req.user.enrolmentNo || req.user.rollNumber || '').trim();
    if (!targetEnrolment) {
      res.status(400);
      throw new Error('Your student profile does not have an associated enrolment number.');
    }
  } else {
    // Teachers & Admins can supply query param ?enrolment=...
    const { enrolment } = req.query;
    if (!enrolment || !enrolment.trim()) {
      res.status(400);
      throw new Error('Please enter a valid student enrolment or roll number');
    }
    targetEnrolment = enrolment.trim();
  }

  // Filter batches by published status and tenant college if applicable
  const batchFilter = { status: 'published' };
  if (['teacher', 'college_admin'].includes(req.user.role) && req.user.college) {
    batchFilter.college = req.user.college;
  }

  const publishedBatches = await Batch.find(batchFilter).select('_id');
  const publishedBatchIds = publishedBatches.map((b) => b._id);

  if (publishedBatchIds.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      data: []
    });
  }

  // Find matching evaluated sheets
  const sheets = await Sheet.find({
    batch: { $in: publishedBatchIds },
    enrolment: new RegExp(`^${targetEnrolment}$`, 'i')
  })
    .populate({
      path: 'batch',
      select: 'examName subjectCode status publishedAt college',
      populate: {
        path: 'college',
        select: 'name code address'
      }
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: sheets.length,
    data: sheets
  });
});

// @desc    Get single published marksheet by sheet ID
// @route   GET /api/results/:sheetId
// @access  Private (Authentication required - Students can only access their own marksheet)
const getResultById = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Authentication required to view student marksheet.');
  }

  const sheet = await Sheet.findById(req.params.sheetId).populate({
    path: 'batch',
    select: 'examName subjectCode status publishedAt college teacher',
    populate: {
      path: 'college',
      select: 'name code address'
    }
  });

  if (!sheet || sheet.batch?.status !== 'published') {
    res.status(404);
    throw new Error('Published marksheet not found or batch not yet published.');
  }

  // Strict role check for students: students can only access their OWN sheet
  if (req.user.role === 'student') {
    const studentRoll = (req.user.enrolmentNo || req.user.rollNumber || '').toUpperCase().trim();
    const sheetRoll = (sheet.enrolment || '').toUpperCase().trim();

    if (!studentRoll || sheetRoll !== studentRoll) {
      res.status(403);
      throw new Error('Access denied: You are only authorized to view your own marksheet.');
    }
  } else if (['teacher', 'college_admin'].includes(req.user.role)) {
    // Cross-college tenant check
    if (req.user.college && sheet.batch.college && sheet.batch.college._id.toString() !== req.user.college.toString()) {
      res.status(403);
      throw new Error('Access denied: You cannot view results from another institution.');
    }
  }

  res.status(200).json({
    success: true,
    data: sheet
  });
});

module.exports = {
  lookupResults,
  getResultById
};
