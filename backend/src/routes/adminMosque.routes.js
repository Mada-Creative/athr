const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const asyncHandler = require('../utils/asyncHandler');
const {
  listPending,
  approve,
  reject,
  listReported,
  listApprovedAll,
  dismissReports,
  removeMosque,
} = require('../controllers/adminMosqueController');

const router = express.Router();

router.use(requireAdmin);
router.get('/pending', asyncHandler(listPending));
router.get('/reported', asyncHandler(listReported));
router.get('/approved', asyncHandler(listApprovedAll));
router.post('/:id/approve', asyncHandler(approve));
router.post('/:id/reject', asyncHandler(reject));
router.post('/:id/dismiss-reports', asyncHandler(dismissReports));
router.post('/:id/remove', asyncHandler(removeMosque));

module.exports = router;
