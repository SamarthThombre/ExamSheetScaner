const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/batchController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.post('/', verifyToken, requireRole('teacher', 'college_admin', 'super_admin'), createBatch);
router.get('/', verifyToken, getBatches);
router.get('/:id/stats', verifyToken, getBatchStats);
router.get('/:id/export', verifyToken, requireRole('teacher', 'college_admin', 'super_admin'), exportBatch);
router.get('/:id/student-list', verifyToken, requireRole('teacher', 'college_admin', 'super_admin'), getBatchStudentList);
router.put('/:id/student-list', verifyToken, requireRole('teacher', 'college_admin', 'super_admin'), updateBatchStudentList);
router.post('/:id/student-list/import-roster', verifyToken, requireRole('teacher', 'college_admin', 'super_admin'), importCollegeRosterToBatch);
router.get('/:id', verifyToken, getBatch);
router.put('/:id', verifyToken, requireRole('teacher', 'college_admin', 'super_admin'), updateBatch);
router.post('/:id/compute-co', verifyToken, requireRole('teacher', 'college_admin', 'super_admin'), computeBatchCO);
router.delete('/:id', verifyToken, requireRole('teacher', 'college_admin', 'super_admin'), deleteBatch);

module.exports = router;
