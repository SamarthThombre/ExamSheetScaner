const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const {
  importStudentCSV,
  getRoster,
  deleteRosterEntry
} = require('../controllers/rosterController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(verifyToken);
router.use(requireRole('college_admin', 'super_admin'));

router.post('/import', upload.single('file'), importStudentCSV);
router.get('/', getRoster);
router.delete('/:id', deleteRosterEntry);

module.exports = router;
