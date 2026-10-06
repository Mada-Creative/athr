const express = require('express');
const requireAuth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { getDayStats, getWeekStats, getOverviewStats } = require('../controllers/statsController');

const router = express.Router();

router.use(requireAuth);
router.get('/day/:date', asyncHandler(getDayStats));
router.get('/week', asyncHandler(getWeekStats));
router.get('/overview', asyncHandler(getOverviewStats));

module.exports = router;
