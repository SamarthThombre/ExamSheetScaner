const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const Batch = require('../models/Batch');
const Sheet = require('../models/Sheet');
const { getBatchFilter } = require('../utils/batchScope');
const { logAudit } = require('../utils/auditLogger');

// @desc    Create a new batch
// @route   POST /api/batches
// @access  Private (teacher, college_admin, super_admin)
const createBatch = asyncHandler(async (req, res) => {
  const { examName, subjectCode, coMaxMarks, coThresholdHigh, coThresholdMid } = req.body;

  let collegeId = req.user.college;
  if (req.user.role === 'super_admin') {
    collegeId = req.body.college || null;
    if (!collegeId) {
      res.status(400);
      throw new Error('Super admin must specify a college');
    }
  }

  // Teacher subject assignment enforcement
  if (req.user.role === 'teacher') {
    const assigned = req.user.assignedSubjects || [];
    const normalized = (subjectCode || '').toUpperCase().trim();
    if (assigned.length === 0) {
      res.status(403);
      throw new Error('You have not been assigned to any subject by your College Admin. Please contact your administrator.');
    }
    if (!assigned.includes(normalized)) {
      res.status(403);
      throw new Error(`You are only permitted to create batches for your assigned subjects: ${assigned.join(', ')}`);
    }
  }

  const batch = await Batch.create({
    examName,
    subjectCode,
    teacher: req.user._id,
    college: collegeId,
    coMaxMarks: coMaxMarks != null ? Number(coMaxMarks) : 14,
    coThresholdHigh: coThresholdHigh != null ? Number(coThresholdHigh) : 65,
    coThresholdMid: coThresholdMid != null ? Number(coThresholdMid) : 50
  });

  res.status(201).json({
    success: true,
    data: batch
  });
});

// @desc    Get batches scoped to user role with pagination & filter
// @route   GET /api/batches
// @access  Private
const getBatches = asyncHandler(async (req, res) => {
  const extra = {};
  if (req.query.status) {
    extra.status = req.query.status;
  }

  const filter = getBatchFilter(req.user, extra);

  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
  const skip = (page - 1) * limit;

  const total = await Batch.countDocuments(filter);
  const batches = await Batch.find(filter)
    .populate('teacher', 'name email')
    .populate('college', 'name code')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const pages = Math.ceil(total / limit) || 1;

  res.status(200).json({
    success: true,
    count: batches.length,
    total,
    page,
    pages,
    data: batches
  });
});

// @desc    Get single batch by ID
// @route   GET /api/batches/:id
// @access  Private
const getBatch = asyncHandler(async (req, res) => {
  const filter = getBatchFilter(req.user, { _id: req.params.id });
  const batch = await Batch.findOne(filter)
    .populate('teacher', 'name email')
    .populate('college', 'name code');

  if (!batch) {
    res.status(404);
    throw new Error('Batch not found');
  }

  res.status(200).json({
    success: true,
    data: batch
  });
});

/**
 * Compute Course Outcome (CO1–CO5) Attainment for all sheets in a batch
 * Formula:
 * OB = q[n] value from Sheet model
 * T = batch.coMaxMarks (default 14)
 * % = (OB / T) * 100
 * AT = 3 if % > coThresholdHigh (default 65), 2 if % >= coThresholdMid (default 50), else 1
 */
const calculateAndStoreCOAttainment = async (batch) => {
  const sheets = await Sheet.find({ batch: batch._id });
  if (!sheets || sheets.length === 0) return;

  const T = batch.coMaxMarks || 14;
  const high = batch.coThresholdHigh || 65;
  const mid = batch.coThresholdMid || 50;

  const coTotals = {
    co1: { obSum: 0, pctSum: 0, atSum: 0, count: 0 },
    co2: { obSum: 0, pctSum: 0, atSum: 0, count: 0 },
    co3: { obSum: 0, pctSum: 0, atSum: 0, count: 0 },
    co4: { obSum: 0, pctSum: 0, atSum: 0, count: 0 },
    co5: { obSum: 0, pctSum: 0, atSum: 0, count: 0 }
  };

  for (const sheet of sheets) {
    for (let n = 1; n <= 5; n++) {
      const qVal = sheet[`q${n}`];
      let ob = 0;
      if (qVal != null && qVal !== '') {
        const parsed = parseFloat(qVal);
        if (!isNaN(parsed)) ob = parsed;
      }

      const pct = T > 0 ? (ob / T) * 100 : 0;
      let at = 1;
      if (pct > high) {
        at = 3;
      } else if (pct >= mid) {
        at = 2;
      } else {
        at = 1;
      }

      sheet[`co${n}OB`] = Math.round(ob * 100) / 100;
      sheet[`co${n}Pct`] = Math.round(pct * 100) / 100;
      sheet[`co${n}AT`] = at;

      const coKey = `co${n}`;
      coTotals[coKey].obSum += ob;
      coTotals[coKey].pctSum += pct;
      coTotals[coKey].atSum += at;
      coTotals[coKey].count += 1;
    }
    await sheet.save();
  }

  const coAttainment = {};
  let totalAtSum = 0;
  for (let n = 1; n <= 5; n++) {
    const key = `co${n}`;
    const count = coTotals[key].count || 1;
    const avgOB = Math.round((coTotals[key].obSum / count) * 100) / 100;
    const avgPct = Math.round((coTotals[key].pctSum / count) * 100) / 100;
    const avgAT = Math.round((coTotals[key].atSum / count) * 100) / 100;
    totalAtSum += avgAT;

    coAttainment[key] = {
      targetMarks: T,
      classAvgOB: avgOB,
      classAvgPct: avgPct,
      attainmentLevel: avgAT
    };
  }
  coAttainment.overallAverage = Math.round((totalAtSum / 5) * 100) / 100;

  batch.coAttainment = coAttainment;
};

// @desc    Update batch details
// @route   PUT /api/batches/:id
// @access  Private (teacher, college_admin, super_admin)
const updateBatch = asyncHandler(async (req, res) => {
  const filter = getBatchFilter(req.user, { _id: req.params.id });
  const batch = await Batch.findOne(filter);

  if (!batch) {
    res.status(404);
    throw new Error('Batch not found');
  }

  const { examName, subjectCode, status, coMaxMarks, coThresholdHigh, coThresholdMid } = req.body;
  const oldStatus = batch.status;

  if (examName !== undefined) batch.examName = examName;
  if (subjectCode !== undefined) batch.subjectCode = subjectCode;
  if (coMaxMarks !== undefined) batch.coMaxMarks = Number(coMaxMarks);
  if (coThresholdHigh !== undefined) batch.coThresholdHigh = Number(coThresholdHigh);
  if (coThresholdMid !== undefined) batch.coThresholdMid = Number(coThresholdMid);

  if (status !== undefined) {
    batch.status = status;
    if (status === 'published') {
      batch.publishedAt = Date.now();
      // Auto-compute CO Attainment upon publishing
      await calculateAndStoreCOAttainment(batch);
    }
  } else if (coMaxMarks !== undefined || coThresholdHigh !== undefined || coThresholdMid !== undefined) {
    // If CO settings changed on an already evaluated batch, recompute
    await calculateAndStoreCOAttainment(batch);
  }

  const updatedBatch = await batch.save();

  if (status === 'published' && oldStatus !== 'published') {
    await logAudit({
      action: 'BATCH_PUBLISHED',
      actor: req.user._id,
      actorRole: req.user.role,
      college: req.user.college || batch.college,
      target: 'Batch',
      targetId: batch._id,
      detail: `Batch "${batch.examName}" published`,
      before: { status: oldStatus },
      after: { status: 'published' }
    });
  }

  res.status(200).json({
    success: true,
    data: updatedBatch
  });
});

// @desc    Trigger explicit CO Attainment computation for a batch
// @route   POST /api/batches/:id/compute-co
// @access  Private (teacher, college_admin, super_admin)
const computeBatchCO = asyncHandler(async (req, res) => {
  const filter = getBatchFilter(req.user, { _id: req.params.id });
  const batch = await Batch.findOne(filter);

  if (!batch) {
    res.status(404);
    throw new Error('Batch not found');
  }

  const { coMaxMarks, coThresholdHigh, coThresholdMid } = req.body;
  if (coMaxMarks !== undefined) batch.coMaxMarks = Number(coMaxMarks);
  if (coThresholdHigh !== undefined) batch.coThresholdHigh = Number(coThresholdHigh);
  if (coThresholdMid !== undefined) batch.coThresholdMid = Number(coThresholdMid);

  await calculateAndStoreCOAttainment(batch);
  await batch.save();

  const sheets = await Sheet.find({ batch: batch._id }).sort({ orderIndex: 1 });

  res.status(200).json({
    success: true,
    data: {
      batch,
      sheets
    }
  });
});

// @desc    Delete batch and all associated sheets
// @route   DELETE /api/batches/:id
// @access  Private (teacher, college_admin, super_admin)
const deleteBatch = asyncHandler(async (req, res) => {
  const filter = getBatchFilter(req.user, { _id: req.params.id });
  const batch = await Batch.findOne(filter);

  if (!batch) {
    res.status(404);
    throw new Error('Batch not found');
  }

  await Sheet.deleteMany({ batch: batch._id });
  await Batch.deleteOne({ _id: batch._id });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get aggregated statistics for a batch
// @route   GET /api/batches/:id/stats
// @access  Private
const getBatchStats = asyncHandler(async (req, res) => {
  const filter = getBatchFilter(req.user, { _id: req.params.id });
  const batch = await Batch.findOne(filter);

  if (!batch) {
    res.status(404);
    throw new Error('Batch not found');
  }

  const batchObjectId = new mongoose.Types.ObjectId(req.params.id);

  const stats = await Sheet.aggregate([
    {
      $match: { batch: batchObjectId }
    },
    {
      $group: {
        _id: null,
        totalSheets: { $sum: 1 },
        okCount: {
          $sum: { $cond: [{ $eq: ['$statusLabel', 'OK'] }, 1, 0] }
        },
        checkCount: {
          $sum: { $cond: [{ $eq: ['$statusLabel', 'CHECK'] }, 1, 0] }
        },
        rescanCount: {
          $sum: { $cond: [{ $eq: ['$statusLabel', 'RESCAN'] }, 1, 0] }
        },
        errorCount: {
          $sum: { $cond: [{ $eq: ['$statusLabel', 'ERROR'] }, 1, 0] }
        },
        avgEnrolmentConf: { $avg: '$enrolmentConf' },
        avgTotalMarks: {
          $avg: {
            $convert: {
              input: '$totalMarks',
              to: 'double',
              onError: null,
              onNull: null
            }
          }
        },
        agreeCount: {
          $sum: { $cond: [{ $eq: ['$sumCheck', 'AGREE'] }, 1, 0] }
        },
        mismatchCount: {
          $sum: { $cond: [{ $eq: ['$sumCheck', 'MISMATCH'] }, 1, 0] }
        },
        unavailableCount: {
          $sum: {
            $cond: [
              {
                $or: [
                  { $eq: ['$sumCheck', 'UNAVAILABLE'] },
                  { $eq: ['$sumCheck', null] },
                  { $not: ['$sumCheck'] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  let data;
  if (stats.length > 0) {
    const s = stats[0];
    data = {
      totalSheets: s.totalSheets || 0,
      okCount: s.okCount || 0,
      checkCount: s.checkCount || 0,
      rescanCount: s.rescanCount || 0,
      errorCount: s.errorCount || 0,
      avgTotalMarks: s.avgTotalMarks != null ? Math.round(s.avgTotalMarks * 10) / 10 : 0,
      avgEnrolmentConf: s.avgEnrolmentConf != null ? Math.round(s.avgEnrolmentConf * 100) / 100 : 0,
      sumCheckBreakdown: {
        AGREE: s.agreeCount || 0,
        MISMATCH: s.mismatchCount || 0,
        UNAVAILABLE: s.unavailableCount || 0
      }
    };
  } else {
    data = {
      totalSheets: 0,
      okCount: 0,
      checkCount: 0,
      rescanCount: 0,
      errorCount: 0,
      avgTotalMarks: 0,
      avgEnrolmentConf: 0,
      sumCheckBreakdown: {
        AGREE: 0,
        MISMATCH: 0,
        UNAVAILABLE: 0
      }
    };
  }

  res.status(200).json({
    success: true,
    data
  });
});

// @desc    Export batch marks data (for Excel / CSV)
// @route   GET /api/batches/:id/export
// @access  Private (teacher, college_admin, super_admin)
const exportBatch = asyncHandler(async (req, res) => {
  const filter = getBatchFilter(req.user, { _id: req.params.id });
  const batch = await Batch.findOne(filter)
    .populate('teacher', 'name email')
    .populate('college', 'name code');

  if (!batch) {
    res.status(404);
    throw new Error('Batch not found');
  }

  // Fetch all sheets for this batch sorted by enrolment
  const sheets = await Sheet.find({ batch: batch._id })
    .sort({ enrolment: 1 });

  res.status(200).json({
    success: true,
    data: {
      batch,
      sheets
    }
  });
});

// @desc    Get batch student list & missing sheets reconciliation
// @route   GET /api/batches/:id/student-list
// @access  Private (teacher, college_admin, super_admin)
const getBatchStudentList = asyncHandler(async (req, res) => {
  const filter = getBatchFilter(req.user, { _id: req.params.id });
  const batch = await Batch.findOne(filter);

  if (!batch) {
    res.status(404);
    throw new Error('Batch not found');
  }

  const sheets = await Sheet.find({ batch: batch._id }).select('enrolment totalMarks orderIndex statusLabel');

  const evaluatedEnrolments = new Map();
  sheets.forEach((s) => {
    if (s.enrolment) {
      evaluatedEnrolments.set(s.enrolment.toUpperCase(), s);
    }
  });

  const roster = batch.studentList || [];
  const rosterSet = new Set(roster.map((s) => s.enrolmentNo.toUpperCase()));

  const missingStudents = roster.filter((student) => !evaluatedEnrolments.has(student.enrolmentNo.toUpperCase()));
  const evaluatedStudents = roster.filter((student) => evaluatedEnrolments.has(student.enrolmentNo.toUpperCase()));
  const unlistedSheets = sheets.filter((sheet) => sheet.enrolment && !rosterSet.has(sheet.enrolment.toUpperCase()));

  res.status(200).json({
    success: true,
    data: {
      studentList: roster,
      totalRoster: roster.length,
      evaluatedCount: evaluatedStudents.length,
      missingCount: missingStudents.length,
      missingStudents,
      unlistedCount: unlistedSheets.length,
      unlistedSheets,
      reconciliationRate: roster.length > 0 ? Math.round((evaluatedStudents.length / roster.length) * 100) : 0
    }
  });
});

// @desc    Update batch student list (consisting of enrolmentNo and name)
// @route   PUT /api/batches/:id/student-list
// @access  Private (teacher, college_admin, super_admin)
const updateBatchStudentList = asyncHandler(async (req, res) => {
  const filter = getBatchFilter(req.user, { _id: req.params.id });
  const batch = await Batch.findOne(filter);

  if (!batch) {
    res.status(404);
    throw new Error('Batch not found');
  }

  const rawList = Array.isArray(req.body.studentList) ? req.body.studentList : [];

  const seen = new Set();
  const cleanList = [];

  for (const item of rawList) {
    const rawEnrol = item.enrolmentNo || item.enrolment || item['Enrollment No'] || item['Enrolment'] || item['Roll No'] || '';
    const cleanEnrol = String(rawEnrol).trim().toUpperCase();
    const rawName = item.name || item.studentName || item['Student Name'] || item['Name'] || '';
    const cleanName = String(rawName).trim();

    if (cleanEnrol && !seen.has(cleanEnrol)) {
      seen.add(cleanEnrol);
      cleanList.push({
        enrolmentNo: cleanEnrol,
        name: cleanName
      });
    }
  }

  batch.studentList = cleanList;
  await batch.save();

  await logAudit({
    action: 'BATCH_ROSTER_UPDATE',
    actor: req.user._id,
    actorRole: req.user.role,
    college: req.user.college || batch.college,
    target: 'Batch',
    targetId: batch._id,
    detail: `Updated student list for batch ${batch.examName}: ${cleanList.length} students loaded`
  });

  const sheets = await Sheet.find({ batch: batch._id }).select('enrolment totalMarks orderIndex statusLabel');
  const evaluatedEnrolments = new Map();
  sheets.forEach((s) => {
    if (s.enrolment) {
      evaluatedEnrolments.set(s.enrolment.toUpperCase(), s);
    }
  });

  const rosterSet = new Set(cleanList.map((s) => s.enrolmentNo.toUpperCase()));
  const missingStudents = cleanList.filter((s) => !evaluatedEnrolments.has(s.enrolmentNo.toUpperCase()));
  const evaluatedStudents = cleanList.filter((s) => evaluatedEnrolments.has(s.enrolmentNo.toUpperCase()));
  const unlistedSheets = sheets.filter((s) => s.enrolment && !rosterSet.has(s.enrolment.toUpperCase()));

  res.status(200).json({
    success: true,
    data: {
      studentList: batch.studentList,
      totalRoster: cleanList.length,
      evaluatedCount: evaluatedStudents.length,
      missingCount: missingStudents.length,
      missingStudents,
      unlistedCount: unlistedSheets.length,
      unlistedSheets,
      reconciliationRate: cleanList.length > 0 ? Math.round((evaluatedStudents.length / cleanList.length) * 100) : 0
    }
  });
});

// @desc    Import students from college student roster into batch
// @route   POST /api/batches/:id/student-list/import-roster
// @access  Private (teacher, college_admin, super_admin)
const importCollegeRosterToBatch = asyncHandler(async (req, res) => {
  const filter = getBatchFilter(req.user, { _id: req.params.id });
  const batch = await Batch.findOne(filter);

  if (!batch) {
    res.status(404);
    throw new Error('Batch not found');
  }

  const StudentRoster = require('../models/StudentRoster');
  const rosterEntries = await StudentRoster.find({ college: batch.college }).sort({ enrolmentNo: 1 });

  if (rosterEntries.length === 0) {
    res.status(400);
    throw new Error('No students found in the college roster. Please upload a CSV student list directly.');
  }

  const existingMap = new Map();
  (batch.studentList || []).forEach((s) => existingMap.set(s.enrolmentNo.toUpperCase(), s.name));

  rosterEntries.forEach((r) => {
    const enrol = r.enrolmentNo.toUpperCase();
    if (!existingMap.has(enrol)) {
      existingMap.set(enrol, r.name || '');
    }
  });

  const mergedList = Array.from(existingMap.entries()).map(([enrolmentNo, name]) => ({
    enrolmentNo,
    name
  }));

  batch.studentList = mergedList;
  await batch.save();

  const sheets = await Sheet.find({ batch: batch._id }).select('enrolment totalMarks orderIndex statusLabel');
  const evaluatedEnrolments = new Map();
  sheets.forEach((s) => {
    if (s.enrolment) {
      evaluatedEnrolments.set(s.enrolment.toUpperCase(), s);
    }
  });

  const missingStudents = mergedList.filter((s) => !evaluatedEnrolments.has(s.enrolmentNo.toUpperCase()));
  const evaluatedStudents = mergedList.filter((s) => evaluatedEnrolments.has(s.enrolmentNo.toUpperCase()));

  res.status(200).json({
    success: true,
    data: {
      studentList: batch.studentList,
      totalRoster: mergedList.length,
      evaluatedCount: evaluatedStudents.length,
      missingCount: missingStudents.length,
      missingStudents,
      reconciliationRate: mergedList.length > 0 ? Math.round((evaluatedStudents.length / mergedList.length) * 100) : 0
    }
  });
});

module.exports = {
  createBatch,
  getBatches,
  getBatch,
  updateBatch,
  deleteBatch,
  getBatchStats,
  computeBatchCO,
  exportBatch,
  getBatchStudentList,
  updateBatchStudentList,
  importCollegeRosterToBatch
};
