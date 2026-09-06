const express = require('express');
const requireAuth = require('../middleware/auth');
const { getByDate, toggle } = require('../controllers/quranController');

const router = express.Router();

router.use(requireAuth);
router.get('/:date', getByDate);
router.patch('/:date', toggle);

module.exports = router;
