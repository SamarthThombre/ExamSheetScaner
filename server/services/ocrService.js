const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * Predict marks and enrolment for a scanned exam sheet
 * @param {string} filePath - Path to image file on disk
 * @param {string} originalname - Original file name
 * @param {string} mimeType - Image mime type
 * @returns {Promise<Object>} OCR prediction data
 */
const predictSheet = async (filePath, originalname, mimeType = 'image/jpeg') => {
  // Mock mode for local testing when explicitly enabled
  if (process.env.OCR_MOCK === 'true') {
    return {
      enrolment: { value: '0801CA251008', confidence: 0.94 },
      subject_code: { value: 'CT10718' },
      total_marks: { value: 54 },
      question_marks: {
        q1: { value: 10, state: 'OK' },
        q2: { value: 8, state: 'OK' },
        q3: { value: 12, state: 'OK' },
        q4: { value: null, state: 'BLANK' },
        q5: { value: 5.5, state: 'OK' },
        sum_check: 'MISMATCH'
      },
      needs_review: true,
      rescan_recommended: false,
      review_reasons: ['QMARK_MISMATCH'],
      format_id: 'B',
      latency_ms: { total: 420 }
    };
  }

  const ocrBaseUrl = process.env.OCR_BASE_URL || 'http://localhost:8000';
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: mimeType });

  // Ensure filename has a valid image extension for FastAPI validator
  const ext = path.extname(filePath) || '.jpg';
  const base = path.basename(filePath, ext);
  const safeFilename = `${base}${ext.toLowerCase() === '.pdf' ? '.jpg' : ext}`;

  const formData = new FormData();
  formData.append('file', blob, safeFilename);
  formData.append('extract_total_marks', 'true');
  formData.append('extract_question_marks', 'true');

  const headers = {
    'Content-Type': 'multipart/form-data'
  };

  if (process.env.OCR_API_KEY) {
    headers['X-API-Key'] = process.env.OCR_API_KEY;
  }

  const startTime = Date.now();
  console.log(`[OCR Stage] [Predict] Sending "${safeFilename}" (${(fileBuffer.length / 1024).toFixed(1)} KB) to OCR microservice (${ocrBaseUrl}/v2/predict)...`);

  let response;
  try {
    response = await axios.post(`${ocrBaseUrl}/v2/predict`, formData, {
      headers,
      timeout: 45000 // 45s timeout for deep neural OCR operations
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    const errPayload = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    console.error(`[OCR Stage ERROR] Failed prediction on "${safeFilename}" after ${duration}ms (Status: ${err.response?.status || 'N/A'}): ${errPayload}`);
    throw err;
  }

  const duration = Date.now() - startTime;
  const data = response.data;
  console.log(`[OCR Stage] [Predict OK] "${safeFilename}" completed in ${duration}ms (Format: ${data.format_id || 'unknown'}, Enrolment: ${data.enrolment?.value || 'N/A'}, Conf: ${data.enrolment?.confidence != null ? data.enrolment.confidence : 'N/A'}, Total: ${data.total_marks?.value != null ? data.total_marks.value : 'N/A'}, Review: ${!!data.needs_review})`);

  // Normalize question marks whether returned as array (q_marks/question_marks) or object
  if (Array.isArray(data.question_marks) || Array.isArray(data.q_marks)) {
    const list = data.question_marks || data.q_marks;
    const qObj = {};
    list.forEach((item) => {
      const qNum = item.q;
      qObj[`q${qNum}`] = {
        value: item.value,
        state: item.flags?.length ? item.flags[0] : (item.value != null ? 'OK' : 'BLANK')
      };
    });
    if (data.marks_sum?.status) {
      qObj.sum_check = data.marks_sum.status;
    }
    data.question_marks = qObj;
  }

  return data;
};

/**
 * Convert an uploaded PDF into individual page images for evaluation
 * @param {string} pdfPath - Absolute or relative path to PDF file
 * @param {string} originalname - Original PDF file name
 * @returns {Promise<Array<{path: string, filename: string, originalname: string, mimetype: string, isFromPdf: boolean, pageNumber: number, sourcePdf: string}>>}
 */
const convertPdfToImages = async (pdfPath, originalname) => {
  const ocrBaseUrl = process.env.OCR_BASE_URL || 'http://localhost:8000';
  const uploadDir = path.resolve(__dirname, '../uploads');

  let fileBuffer;
  try {
    fileBuffer = fs.readFileSync(pdfPath);
  } catch (fsErr) {
    console.error(`[PDF Pipeline ERROR] Could not read PDF file at "${pdfPath}": ${fsErr.message}`);
    throw fsErr;
  }

  const fileSizeMb = (fileBuffer.length / (1024 * 1024)).toFixed(2);
  const startTime = Date.now();
  console.log(`[PDF Pipeline] [Convert] Initiating PDF rasterization for "${originalname}" (${fileSizeMb} MB) via ${ocrBaseUrl}/v2/convert-pdf...`);

  const blob = new Blob([fileBuffer], { type: 'application/pdf' });

  const formData = new FormData();
  formData.append('file', blob, originalname || 'sheets.pdf');
  formData.append('scale', '2.0');
  formData.append('output_dir', uploadDir);

  const headers = {
    'Content-Type': 'multipart/form-data'
  };

  if (process.env.OCR_API_KEY) {
    headers['X-API-Key'] = process.env.OCR_API_KEY;
  }

  let response;
  try {
    response = await axios.post(`${ocrBaseUrl}/v2/convert-pdf`, formData, {
      headers,
      timeout: 60000
    });
  } catch (axiosErr) {
    const duration = Date.now() - startTime;
    const errPayload = axiosErr.response?.data ? JSON.stringify(axiosErr.response.data) : axiosErr.message;
    console.error(`[PDF Pipeline ERROR] PDF conversion endpoint failed for "${originalname}" after ${duration}ms (Status: ${axiosErr.response?.status || 'N/A'}): ${errPayload}`);
    throw axiosErr;
  }

  const duration = Date.now() - startTime;
  const data = response.data;
  if (!data.success || !Array.isArray(data.pages)) {
    console.error(`[PDF Pipeline ERROR] PDF conversion returned invalid response for "${originalname}":`, data);
    throw new Error('PDF to image conversion failed: ' + (data.detail || 'Unknown error'));
  }

  console.log(`[PDF Pipeline] [Convert OK] Extracted ${data.pages.length} page(s) from "${originalname}" in ${duration}ms`);

  const resultFiles = [];
  for (const page of data.pages) {
    let finalPath = page.file_path;
    let finalFilename = page.filename;

    // If server returned base64 (fallback for remote deployment)
    if (!finalPath && page.base64_data) {
      finalFilename = page.filename || `pdf-page-${page.page_number}.jpg`;
      finalPath = path.join(uploadDir, finalFilename);
      fs.writeFileSync(finalPath, Buffer.from(page.base64_data, 'base64'));
    }

    resultFiles.push({
      path: finalPath,
      filename: finalFilename,
      originalname: page.original_name || `${originalname} (Page ${page.page_number})`,
      mimetype: 'image/jpeg',
      isFromPdf: true,
      pageNumber: page.page_number,
      sourcePdf: originalname
    });
  }

  console.log(`[PDF Pipeline] Prepared ${resultFiles.length} page image file(s) for OCR evaluation queue`);
  return resultFiles;
};

module.exports = {
  predictSheet,
  convertPdfToImages
};
