const express = require('express');
const requireAuth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { getContent, getByDate, updateProgress } = require('../controllers/athkarController');

const router = express.Router();

router.get('/content', getContent); // public, static text bundle, synchronous

router.use(requireAuth);
router.get('/:date', asyncHandler(getByDate));
router.patch('/:date/:category', asyncHandler(updateProgress));

module.exports = router;
