const express = require('express');
const requireAuth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { getByDate, toggle } = require('../controllers/prayerController');

const router = express.Router();

router.use(requireAuth);
router.get('/:date', asyncHandler(getByDate));
router.patch('/:date/toggle', asyncHandler(toggle));

module.exports = router;
