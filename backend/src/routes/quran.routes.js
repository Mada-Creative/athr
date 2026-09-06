const express = require('express');
const requireAuth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { getByDate, toggle } = require('../controllers/quranController');

const router = express.Router();

router.use(requireAuth);
router.get('/:date', asyncHandler(getByDate));
router.patch('/:date', asyncHandler(toggle));

module.exports = router;
