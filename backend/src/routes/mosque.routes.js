const express = require('express');
const requireAuth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { create, listApproved, nearest, listOsm, nearestOsm, report } = require('../controllers/mosqueController');

const router = express.Router();

router.use(requireAuth);
router.get('/', asyncHandler(listApproved));
router.get('/nearest', asyncHandler(nearest));
router.get('/osm', asyncHandler(listOsm));
router.get('/osm/nearest', asyncHandler(nearestOsm));
router.post('/', asyncHandler(create));
router.post('/:id/report', asyncHandler(report));

module.exports = router;
