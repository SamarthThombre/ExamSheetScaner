const express = require('express');
const router = express.Router();
const { lookupResults, getResultById } = require('../controllers/resultController');
const { verifyToken } = require('../middleware/authMiddleware');

// Protected endpoints - authentication required to view any examination marks
router.use(verifyToken);

router.get('/lookup', lookupResults);
router.get('/:sheetId', getResultById);

module.exports = router;
