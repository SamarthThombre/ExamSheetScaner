const express = require('express');
const router = express.Router();
const { uploadBatchSheets } = require('../controllers/uploadController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');
const { upload } = require('../services/imageProcessor');

router.post(
  '/:batchId/upload',
  verifyToken,
  requireRole('teacher', 'college_admin', 'super_admin'),
  (req, res, next) => {
    upload.any()(req, res, (err) => {
      if (err) {
        console.error(`[Upload Middleware ERROR] Multer rejected upload for Batch ${req.params.batchId}:`, err.message);
        res.status(400);
        return next(err);
      }
      next();
    });
  },
  uploadBatchSheets
);

module.exports = router;
