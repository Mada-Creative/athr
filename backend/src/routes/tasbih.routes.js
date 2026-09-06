const express = require('express');
const requireAuth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { list, create, increment, reset, remove } = require('../controllers/tasbihController');

const router = express.Router();

router.use(requireAuth);
router.get('/', asyncHandler(list));
router.post('/', asyncHandler(create));
router.patch('/:id/increment', asyncHandler(increment));
router.patch('/:id/reset', asyncHandler(reset));
router.delete('/:id', asyncHandler(remove));

module.exports = router;
