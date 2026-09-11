const express = require('express');
const requireAuth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { getByDate, toggle, setExcused, setVoluntaryFasting } = require('../controllers/prayerController');

const router = express.Router();

router.use(requireAuth);
router.get('/:date', asyncHandler(getByDate));
router.patch('/:date/toggle', asyncHandler(toggle));
router.patch('/:date/excuse', asyncHandler(setExcused));
router.patch('/:date/fasting', asyncHandler(setVoluntaryFasting));

module.exports = router;
