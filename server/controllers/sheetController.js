const asyncHandler = require('express-async-handler');
const Batch = require('../models/Batch');
const Sheet = require('../models/Sheet');
const { getBatchFilter } = require('../utils/batchScope');
const { logAudit } = require('../utils/auditLogger');

// @desc    Get all sheets for a scoped batch
// @route   GET /api/batches/:batchId/sheets
// @access  Private
const getSheets = asyncHandler(async (req, res) => {
  const batchFilter = getBatchFilter(req.user, { _id: req.params.batchId });
  const batch = await Batch.findOne(batchFilter);

  if (!batch) {
    res.status(404);
    throw new Error('Batch not found');
  }

  const sheetFilter = { batch: batch._id };
  if (req.query.status) {
    sheetFilter.statusLabel = req.query.status;
  }

  if (req.query.search && req.query.search.trim()) {
    const rawSearch = req.query.search.trim();
    const escaped = rawSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escaped, 'i');

    const num = parseInt(rawSearch, 10);
    if (!isNaN(num) && String(num) === rawSearch) {
      sheetFilter.$or = [
        { enrolment: searchRegex },
        { orderIndex: num }
      ];
    } else {
      sheetFilter.enrolment = searchRegex;
    }
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const skip = (page - 1) * limit;

  const total = await Sheet.countDocuments(sheetFilter);
  const sheets = await Sheet.find(sheetFilter)
    .sort({ orderIndex: 1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    success: true,
    count: sheets.length,
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
    data: sheets
  });
});

// @desc    Get single sheet by ID within a scoped batch
// @route   GET /api/batches/:batchId/sheets/:id
// @access  Private
const getSheet = asyncHandler(async (req, res) => {
  const batchFilter = getBatchFilter(req.user, { _id: req.params.batchId });
  const batch = await Batch.findOne(batchFilter);

  if (!batch) {
    res.status(404);
    throw new Error('Batch not found');
  }

  const sheet = await Sheet.findOne({
    _id: req.params.id,
    batch: batch._id
  });

  if (!sheet) {
    res.status(404);
    throw new Error('Sheet not found');
  }

  res.status(200).json({
    success: true,
    data: sheet
  });
});

// @desc    Update editable fields on a sheet and recalculate statusLabel
// @route   PUT /api/batches/:batchId/sheets/:id
// @access  Private (teacher, college_admin, super_admin)
const updateSheet = asyncHandler(async (req, res) => {
  const batchFilter = getBatchFilter(req.user, { _id: req.params.batchId });
  const batch = await Batch.findOne(batchFilter);

  if (!batch) {
    res.status(404);
    throw new Error('Batch not found');
  }

  const sheet = await Sheet.findOne({
    _id: req.params.id,
    batch: batch._id
  });

  if (!sheet) {
    res.status(404);
    throw new Error('Sheet not found');
  }

  const oldSnapshot = {
    q1: sheet.q1,
    q2: sheet.q2,
    q3: sheet.q3,
    q4: sheet.q4,
    q5: sheet.q5,
    totalMarks: sheet.totalMarks
  };

  const updatableFields = ['enrolment', 'totalMarks', 'q1', 'q2', 'q3', 'q4', 'q5'];
  updatableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      sheet[field] = req.body[field];
    }
  });

  // Saving or editing a sheet marks it verified and confirmed
  sheet.needsReview = false;
  sheet.rescanRecommended = false;
  sheet.reviewReasons = [];
  sheet.statusLabel = req.body.statusLabel || 'OK';
  if (sheet.uploadStatus === 'failed') {
    sheet.uploadStatus = 'done';
  }

  // Update sumCheck if totalMarks and question marks are valid numbers
  const qVals = [sheet.q1, sheet.q2, sheet.q3, sheet.q4, sheet.q5]
    .map((v) => (v !== null && v !== undefined && v !== '' ? parseFloat(v) : NaN))
    .filter((v) => !isNaN(v));

  if (sheet.totalMarks !== null && sheet.totalMarks !== undefined && sheet.totalMarks !== '') {
    const totalNum = parseFloat(sheet.totalMarks);
    if (!isNaN(totalNum) && qVals.length > 0) {
      const qSum = qVals.reduce((a, b) => a + b, 0);
      sheet.sumCheck = Math.abs(qSum - totalNum) < 0.01 ? 'AGREE' : 'MISMATCH';
    }
  }

  // Human verified questions
  ['q1', 'q2', 'q3', 'q4', 'q5'].forEach((qKey) => {
    const stateKey = `${qKey}State`;
    if (sheet[qKey] !== null && sheet[qKey] !== undefined && sheet[qKey] !== '') {
      sheet[stateKey] = 'OK';
    }
  });

  const updatedSheet = await sheet.save();

  // Recalculate batch counts to keep summary cards accurate
  const [okCount, checkCount, rescanCount, errorCount, totalSheets] = await Promise.all([
    Sheet.countDocuments({ batch: batch._id, statusLabel: { $in: ['OK', 'VERIFIED'] } }),
    Sheet.countDocuments({ batch: batch._id, statusLabel: 'CHECK' }),
    Sheet.countDocuments({ batch: batch._id, statusLabel: 'RESCAN' }),
    Sheet.countDocuments({ batch: batch._id, statusLabel: 'ERROR' }),
    Sheet.countDocuments({ batch: batch._id })
  ]);

  batch.okCount = okCount;
  batch.checkCount = checkCount;
  batch.rescanCount = rescanCount;
  batch.errorCount = errorCount;
  batch.totalSheets = totalSheets;
  await batch.save();

  await logAudit({
    action: 'SHEET_EDIT',
    actor: req.user._id,
    actorRole: req.user.role,
    college: req.user.college || batch.college,
    target: 'Sheet',
    targetId: sheet._id,
    detail: `Marks verified & edited for enrolment ${sheet.enrolment || 'Unread'}`,
    before: oldSnapshot,
    after: {
      q1: sheet.q1,
      q2: sheet.q2,
      q3: sheet.q3,
      q4: sheet.q4,
      q5: sheet.q5,
      totalMarks: sheet.totalMarks,
      statusLabel: sheet.statusLabel
    }
  });

  res.status(200).json({
    success: true,
    data: updatedSheet
  });
});

// @desc    Delete a sheet from a batch
// @route   DELETE /api/batches/:batchId/sheets/:id
// @access  Private (teacher, college_admin, super_admin)
const deleteSheet = asyncHandler(async (req, res) => {
  const batchFilter = getBatchFilter(req.user, { _id: req.params.batchId });
  const batch = await Batch.findOne(batchFilter);

  if (!batch) {
    res.status(404);
    throw new Error('Batch not found');
  }

  const sheet = await Sheet.findOne({
    _id: req.params.id,
    batch: batch._id
  });

  if (!sheet) {
    res.status(404);
    throw new Error('Sheet not found');
  }

  await Sheet.deleteOne({ _id: sheet._id });

  // Recalculate batch counts
  const [okCount, checkCount, rescanCount, errorCount, totalSheets] = await Promise.all([
    Sheet.countDocuments({ batch: batch._id, statusLabel: { $in: ['OK', 'VERIFIED'] } }),
    Sheet.countDocuments({ batch: batch._id, statusLabel: 'CHECK' }),
    Sheet.countDocuments({ batch: batch._id, statusLabel: 'RESCAN' }),
    Sheet.countDocuments({ batch: batch._id, statusLabel: 'ERROR' }),
    Sheet.countDocuments({ batch: batch._id })
  ]);

  batch.okCount = okCount;
  batch.checkCount = checkCount;
  batch.rescanCount = rescanCount;
  batch.errorCount = errorCount;
  batch.totalSheets = totalSheets;
  await batch.save();

  res.status(200).json({
    success: true,
    data: {}
  });
});

module.exports = {
  getSheets,
  getSheet,
  updateSheet,
  deleteSheet
};
