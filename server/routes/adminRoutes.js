const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  updateCollege,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  addSubject,
  updateSubject,
  deleteSubject,
  getTeachers,
  createTeacher,
  assignTeacher,
  deleteTeacher,
  getColleges,
  createCollege,
  deleteCollege,
  getAuditLogs
} = require('../controllers/adminController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// College Admin & Super Admin routes
router.get('/stats', verifyToken, requireRole('college_admin', 'super_admin'), getAdminStats);
router.get('/audit', verifyToken, requireRole('college_admin', 'super_admin'), getAuditLogs);
router.put('/college', verifyToken, requireRole('college_admin', 'super_admin'), updateCollege);

// Department & Subject management
router.get('/departments', verifyToken, getDepartments); // Read accessible to authenticated users (admin & teachers)
router.post('/departments', verifyToken, requireRole('college_admin', 'super_admin'), createDepartment);
router.put('/departments/:id', verifyToken, requireRole('college_admin', 'super_admin'), updateDepartment);
router.delete('/departments/:id', verifyToken, requireRole('college_admin', 'super_admin'), deleteDepartment);

router.post('/departments/:deptId/subjects', verifyToken, requireRole('college_admin', 'super_admin'), addSubject);
router.put('/departments/:deptId/subjects/:subId', verifyToken, requireRole('college_admin', 'super_admin'), updateSubject);
router.delete('/departments/:deptId/subjects/:subId', verifyToken, requireRole('college_admin', 'super_admin'), deleteSubject);

// Teachers management & Subject assignment
router.get('/teachers', verifyToken, requireRole('college_admin', 'super_admin'), getTeachers);
router.post('/teachers', verifyToken, requireRole('college_admin', 'super_admin'), createTeacher);
router.put('/teachers/:teacherId/assign', verifyToken, requireRole('college_admin', 'super_admin'), assignTeacher);
router.delete('/teachers/:teacherId', verifyToken, requireRole('college_admin', 'super_admin'), deleteTeacher);

// Super Admin exclusive routes
router.get('/colleges', verifyToken, requireRole('super_admin'), getColleges);
router.post('/colleges', verifyToken, requireRole('super_admin'), createCollege);
router.delete('/colleges/:id', verifyToken, requireRole('super_admin'), deleteCollege);

module.exports = router;
