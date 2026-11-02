const express = require('express');
const router = express.Router();
const {
  getSheets,
  getSheet,
  updateSheet,
  deleteSheet
} = require('../controllers/sheetController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.get('/:batchId/sheets', verifyToken, getSheets);
router.get('/:batchId/sheets/:id', verifyToken, getSheet);
router.put('/:batchId/sheets/:id', verifyToken, requireRole('teacher', 'college_admin', 'super_admin'), updateSheet);
router.delete('/:batchId/sheets/:id', verifyToken, requireRole('teacher', 'college_admin', 'super_admin'), deleteSheet);

module.exports = router;
