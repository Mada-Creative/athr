const express = require('express');
const requireAuth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { getDayStats, getWeekStats } = require('../controllers/statsController');

const router = express.Router();

router.use(requireAuth);
router.get('/day/:date', asyncHandler(getDayStats));
router.get('/week', asyncHandler(getWeekStats));

module.exports = router;
