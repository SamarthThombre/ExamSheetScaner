const asyncHandler = require('express-async-handler');
const Batch = require('../models/Batch');
const Sheet = require('../models/Sheet');
const ocrService = require('../services/ocrService');
const { cleanupFile } = require('../services/imageProcessor');
const { getBatchFilter } = require('../utils/batchScope');

// @desc    Upload sheet images and trigger OCR processing for a batch
// @route   POST /api/batches/:batchId/upload
// @access  Private (teacher, college_admin, super_admin)
const uploadBatchSheets = asyncHandler(async (req, res) => {
  const batchFilter = getBatchFilter(req.user, { _id: req.params.batchId });
  const batch = await Batch.findOne(batchFilter);

  const incomingFiles = req.files || (req.file ? [req.file] : []);
  console.log(`[Upload Ingest] Received upload request for Batch "${req.params.batchId}" by User "${req.user?.name || req.user?._id}" (${req.user?.role}). Total files received: ${incomingFiles.length}`);

  if (!batch) {
    console.error(`[Upload Ingest ERROR] Batch not found or unauthorized for ID: ${req.params.batchId}`);
    if (incomingFiles.length > 0) {
      incomingFiles.forEach((f) => cleanupFile(f.path));
    }
    res.status(404);
    throw new Error('Batch not found');
  }

  if (!incomingFiles || incomingFiles.length === 0) {
    console.error(`[Upload Ingest ERROR] No files attached in upload payload for Batch "${batch.examName}" (${batch._id})`);
    res.status(400);
    throw new Error('Please upload at least one image or PDF file');
  }

  incomingFiles.forEach((f, idx) => {
    const sizeMb = (f.size / (1024 * 1024)).toFixed(2);
    console.log(`[Upload Ingest] File ${idx + 1}/${incomingFiles.length}: "${f.originalname}" (Stored as "${f.filename}", Type: ${f.mimetype}, Size: ${sizeMb} MB)`);
  });

  // Update batch status to processing
  batch.status = 'processing';
  await batch.save();
  console.log(`[Batch Status] Batch "${batch.examName}" (${batch._id}) status set to "processing"`);

  // Expand any PDF files into individual sheet images
  const filesToProcess = [];
  const pdfs = incomingFiles.filter(
    (f) => f.mimetype === 'application/pdf' || (f.originalname && f.originalname.toLowerCase().endsWith('.pdf'))
  );
  const images = incomingFiles.length - pdfs.length;
  console.log(`[File Pipeline] Breakdown: ${pdfs.length} PDF document(s), ${images} standalone image file(s)`);

  for (const file of incomingFiles) {
    const isPdf =
      file.mimetype === 'application/pdf' ||
      (file.originalname && file.originalname.toLowerCase().endsWith('.pdf'));

    if (isPdf) {
      console.log(`[PDF Pipeline] Expanding multi-page PDF document: "${file.originalname}"...`);
      try {
        const pageFiles = await ocrService.convertPdfToImages(file.path, file.originalname);
        if (pageFiles.length === 0) {
          throw new Error('PDF file has no extracted pages');
        }
        console.log(`[PDF Pipeline] Successfully expanded "${file.originalname}" into ${pageFiles.length} page sheet image(s)`);
        filesToProcess.push(...pageFiles);
      } catch (pdfErr) {
        console.error(`[PDF Pipeline ERROR] Failed to expand PDF "${file.originalname}":`, pdfErr.message);
        filesToProcess.push({
          ...file,
          conversionError: `PDF conversion failed: ${pdfErr.message}`
        });
      }
    } else {
      filesToProcess.push(file);
    }
  }

  console.log(`[Processing Queue] Total evaluation items queued for OCR: ${filesToProcess.length}`);

  // Find current highest orderIndex to maintain sequence
  const lastSheet = await Sheet.findOne({ batch: batch._id }).sort({ orderIndex: -1 });
  let currentOrderIndex = lastSheet ? lastSheet.orderIndex : 0;

  const createdSheets = [];

  for (let idx = 0; idx < filesToProcess.length; idx++) {
    const file = filesToProcess[idx];
    currentOrderIndex += 1;
    const progressTag = `[Sheet Evaluation ${idx + 1}/${filesToProcess.length}]`;
    console.log(`${progressTag} Beginning processing for "${file.originalname}" (OrderIndex: ${currentOrderIndex})...`);

    let sheetData = {
      batch: batch._id,
      orderIndex: currentOrderIndex,
      filename: file.originalname,
      uploadStatus: 'uploading'
    };

    if (file.conversionError) {
      console.warn(`${progressTag} Sheet flagged with conversion failure: "${file.conversionError}"`);
      sheetData = {
        ...sheetData,
        uploadStatus: 'failed',
        statusLabel: 'ERROR',
        imageUrl: file.filename ? `/uploads/${file.filename}` : null,
        localImagePath: file.filename ? `/uploads/${file.filename}` : null,
        errorMessage: file.conversionError
      };
      const sheet = await Sheet.create(sheetData);
      console.log(`${progressTag} Saved ERROR Sheet record in database (ID: ${sheet._id})`);
      createdSheets.push(sheet);
      continue;
    }

    try {
      const ocrResult = await ocrService.predictSheet(
        file.path,
        file.originalname,
        file.mimetype || 'image/jpeg'
      );

      let statusLabel = 'OK';
      if (ocrResult.rescan_recommended) {
        statusLabel = 'RESCAN';
      } else if (ocrResult.needs_review) {
        statusLabel = 'CHECK';
      }

      const relativeUrl = `/uploads/${file.filename}`;

      sheetData = {
        ...sheetData,
        formatId: ocrResult.format_id || null,
        enrolment: ocrResult.enrolment?.value || null,
        enrolmentRaw: ocrResult.enrolment?.value || null,
        enrolmentConf: ocrResult.enrolment?.confidence != null ? ocrResult.enrolment.confidence : 0,
        subjectCode: ocrResult.subject_code?.value || null,
        totalMarks: ocrResult.total_marks?.value != null ? String(ocrResult.total_marks.value) : null,
        q1: ocrResult.question_marks?.q1?.value != null ? String(ocrResult.question_marks.q1.value) : null,
        q2: ocrResult.question_marks?.q2?.value != null ? String(ocrResult.question_marks.q2.value) : null,
        q3: ocrResult.question_marks?.q3?.value != null ? String(ocrResult.question_marks.q3.value) : null,
        q4: ocrResult.question_marks?.q4?.value != null ? String(ocrResult.question_marks.q4.value) : null,
        q5: ocrResult.question_marks?.q5?.value != null ? String(ocrResult.question_marks.q5.value) : null,
        q1State: ocrResult.question_marks?.q1?.state || null,
        q2State: ocrResult.question_marks?.q2?.state || null,
        q3State: ocrResult.question_marks?.q3?.state || null,
        q4State: ocrResult.question_marks?.q4?.state || null,
        q5State: ocrResult.question_marks?.q5?.state || null,
        sumCheck: ocrResult.question_marks?.sum_check || null,
        needsReview: !!ocrResult.needs_review,
        rescanRecommended: !!ocrResult.rescan_recommended,
        reviewReasons: Array.isArray(ocrResult.review_reasons) ? ocrResult.review_reasons : [],
        statusLabel,
        uploadStatus: 'done',
        latencyMs: ocrResult.latency_ms?.total || 0,
        imageUrl: relativeUrl,
        localImagePath: relativeUrl,
        errorMessage: null
      };

      console.log(`${progressTag} Evaluation SUCCESS -> Enrolment: "${sheetData.enrolment || 'N/A'}" (Conf: ${(sheetData.enrolmentConf * 100).toFixed(0)}%), Total Marks: ${sheetData.totalMarks || 'N/A'}, Questions: [Q1:${sheetData.q1 || '-'}, Q2:${sheetData.q2 || '-'}, Q3:${sheetData.q3 || '-'}, Q4:${sheetData.q4 || '-'}, Q5:${sheetData.q5 || '-'}], Status: ${statusLabel}`);
    } catch (err) {
      console.error(`${progressTag} Evaluation FAILED on "${file.originalname}":`, err.message);
      const detailedError =
        err.response?.data?.detail ||
        (typeof err.response?.data === 'string' ? err.response.data : null) ||
        err.response?.data?.message ||
        err.message ||
        'OCR processing failed';
      sheetData = {
        ...sheetData,
        uploadStatus: 'failed',
        statusLabel: 'ERROR',
        imageUrl: `/uploads/${file.filename}`,
        localImagePath: `/uploads/${file.filename}`,
        errorMessage: detailedError
      };
    }

    const sheet = await Sheet.create(sheetData);
    console.log(`${progressTag} Saved Sheet document to DB (ID: ${sheet._id}, Status: ${sheet.statusLabel})`);
    createdSheets.push(sheet);
  }

  // Update batch metrics and state
  const totalSheets = await Sheet.countDocuments({ batch: batch._id });
  const okCount = await Sheet.countDocuments({ batch: batch._id, statusLabel: 'OK' });
  const checkCount = await Sheet.countDocuments({ batch: batch._id, statusLabel: 'CHECK' });
  const rescanCount = await Sheet.countDocuments({ batch: batch._id, statusLabel: 'RESCAN' });
  const errorCount = await Sheet.countDocuments({ batch: batch._id, statusLabel: 'ERROR' });

  batch.totalSheets = totalSheets;
  batch.okCount = okCount;
  batch.checkCount = checkCount;
  batch.rescanCount = rescanCount;
  batch.errorCount = errorCount;
  batch.status = 'done';
  await batch.save();

  console.log(`[Batch Completed] Batch "${batch.examName}" (${batch._id}) evaluation finished successfully! Summary: Total=${totalSheets}, OK=${okCount}, CHECK=${checkCount}, RESCAN=${rescanCount}, ERROR=${errorCount}. Status: "done"`);

  res.status(201).json({
    success: true,
    count: createdSheets.length,
    data: {
      batch,
      sheets: createdSheets
    }
  });
});

module.exports = {
  uploadBatchSheets
};
