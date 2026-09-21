const express = require('express');
const requireAuth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { create, listApproved, nearest, report } = require('../controllers/mosqueController');

const router = express.Router();

router.use(requireAuth);
router.get('/', asyncHandler(listApproved));
router.get('/nearest', asyncHandler(nearest));
router.post('/', asyncHandler(create));
router.post('/:id/report', asyncHandler(report));

module.exports = router;
