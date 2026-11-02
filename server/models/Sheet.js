const mongoose = require('mongoose');

const sheetSchema = new mongoose.Schema({
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true
  },
  orderIndex:   { type: Number, default: 0 },
  filename:     { type: String, default: '' },
  formatId:     { type: String, default: null },        // "A" | "B" | null

  // OCR outputs
  enrolment:       { type: String, default: null },
  enrolmentRaw:    { type: String, default: null },
  enrolmentConf:   { type: Number, default: 0 },        // 0.0 – 1.0

  subjectCode:     { type: String, default: null },
  totalMarks:      { type: String, default: null },     // stored as string ("54", "5.5")

  // Per-question marks (display values)
  q1: { type: String, default: null },
  q2: { type: String, default: null },
  q3: { type: String, default: null },
  q4: { type: String, default: null },
  q5: { type: String, default: null },

  // Per-question states
  q1State: { type: String, default: null },
  q2State: { type: String, default: null },
  q3State: { type: String, default: null },
  q4State: { type: String, default: null },
  q5State: { type: String, default: null },

  // Course Outcome (CO) Attainment values per student
  co1OB:  { type: Number, default: null },
  co1Pct: { type: Number, default: null },
  co1AT:  { type: Number, default: null },

  co2OB:  { type: Number, default: null },
  co2Pct: { type: Number, default: null },
  co2AT:  { type: Number, default: null },

  co3OB:  { type: Number, default: null },
  co3Pct: { type: Number, default: null },
  co3AT:  { type: Number, default: null },

  co4OB:  { type: Number, default: null },
  co4Pct: { type: Number, default: null },
  co4AT:  { type: Number, default: null },

  co5OB:  { type: Number, default: null },
  co5Pct: { type: Number, default: null },
  co5AT:  { type: Number, default: null },

  // State values: "OK" | "BLANK" | "UNPARSEABLE" | "LOW_CONF" | "OUT_OF_RANGE" | "NOT_HALF_STEP"
  sumCheck: {
    type: String,
    enum: ['AGREE', 'MISMATCH', 'UNAVAILABLE', null],
    default: null
  },

  // Review flags
  needsReview:        { type: Boolean, default: false },
  rescanRecommended:  { type: Boolean, default: false },
  reviewReasons:      [{ type: String }],               // e.g. ["LOW_CONF", "QMARK_MISMATCH"]

  // Cached status label (set after OCR)
  statusLabel: {
    type: String,
    enum: ['OK', 'VERIFIED', 'CHECK', 'RESCAN', 'ERROR', 'PENDING'],
    default: 'PENDING'
  },

  uploadStatus: {
    type: String,
    enum: ['queued', 'uploading', 'done', 'failed'],
    default: 'queued'
  },
  errorMessage:   { type: String, default: null },
  latencyMs:      { type: Number, default: 0 },
  localImagePath: { type: String, default: null },      // URI string from Android or web upload
  imageUrl:       { type: String, default: null }       // Static HTTP path to uploaded image scan

}, { timestamps: true });

// Index for fast batch-scoped queries
sheetSchema.index({ batch: 1, orderIndex: 1 });
sheetSchema.index({ batch: 1, statusLabel: 1 });

module.exports = mongoose.model('Sheet', sheetSchema);
