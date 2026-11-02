const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
const asyncHandler = require('express-async-handler');

// @desc    Health check including MongoDB and Python OCR service
// @route   GET /api/health
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const databaseStatus = isDbConnected ? 'connected' : 'disconnected';

  let ocrServiceStatus = 'unreachable';
  let ocrLatencyMs = null;

  const ocrBaseUrl = process.env.OCR_BASE_URL || 'http://localhost:8000';
  const startTime = Date.now();

  try {
    await axios.get(`${ocrBaseUrl}/health`, {
      timeout: 3000
    });
    ocrLatencyMs = Date.now() - startTime;
    ocrServiceStatus = 'ok';
  } catch (err) {
    ocrServiceStatus = 'unreachable';
    ocrLatencyMs = null;
  }

  res.status(200).json({
    status: 'ok',
    database: databaseStatus,
    ocr_service: ocrServiceStatus,
    ocr_latency_ms: ocrLatencyMs,
    timestamp: new Date().toISOString()
  });
}));

module.exports = router;
