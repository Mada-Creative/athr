const express = require('express');
const requireAuth = require('../middleware/auth');
const { getDayStats, getWeekStats } = require('../controllers/statsController');

const router = express.Router();

router.use(requireAuth);
router.get('/day/:date', getDayStats);
router.get('/week', getWeekStats);

module.exports = router;
