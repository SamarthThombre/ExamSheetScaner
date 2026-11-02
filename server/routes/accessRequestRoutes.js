const express = require('express');
const router = express.Router();
const {
  submitAccessRequest,
  checkRequestStatus,
  getCollegeAccessRequests,
  approveAccessRequest,
  rejectAccessRequest
} = require('../controllers/accessRequestController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Public access request routes
router.post('/', submitAccessRequest);
router.get('/status', checkRequestStatus);

// Admin access request routes
router.get('/admin', verifyToken, requireRole('college_admin', 'super_admin'), getCollegeAccessRequests);
router.patch('/admin/:id/approve', verifyToken, requireRole('college_admin', 'super_admin'), approveAccessRequest);
router.patch('/admin/:id/reject', verifyToken, requireRole('college_admin', 'super_admin'), rejectAccessRequest);

module.exports = router;
