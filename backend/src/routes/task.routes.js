const express = require('express');
const requireAuth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { list, create, remove, getLogsByDate, toggleLog } = require('../controllers/taskController');

const router = express.Router();

router.use(requireAuth);
router.get('/', asyncHandler(list));
router.post('/', asyncHandler(create));
router.delete('/:id', asyncHandler(remove));
router.get('/logs/:date', asyncHandler(getLogsByDate));
router.patch('/logs/:date/:taskId', asyncHandler(toggleLog));

module.exports = router;
