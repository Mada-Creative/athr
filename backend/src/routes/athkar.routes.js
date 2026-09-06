const express = require('express');
const requireAuth = require('../middleware/auth');
const { getContent, getByDate, updateProgress } = require('../controllers/athkarController');

const router = express.Router();

router.get('/content', getContent); // public, static text bundle

router.use(requireAuth);
router.get('/:date', getByDate);
router.patch('/:date/:category', updateProgress);

module.exports = router;
