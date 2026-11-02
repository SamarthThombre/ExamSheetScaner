const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  getCollegeBranches,
  verifyStudentEmail,
  getGoogleConfig,
  googleLogin
} = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/college-branches', getCollegeBranches);
router.post('/verify-student-email', verifyStudentEmail);
router.get('/google/config', getGoogleConfig);
router.post('/google', googleLogin);
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', verifyToken, getMe);

module.exports = router;
