const express = require('express');
const router = express.Router();
const {
  createIssue,
  getStudentIssues,
  getTeacherIssues,
  updateIssue
} = require('../controllers/issueController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.post('/', verifyToken, createIssue);
router.get('/my', verifyToken, requireRole('student'), getStudentIssues);
router.get('/teacher', verifyToken, requireRole('teacher', 'college_admin', 'super_admin'), getTeacherIssues);
router.put('/:id', verifyToken, requireRole('teacher', 'college_admin', 'super_admin'), updateIssue);

module.exports = router;
