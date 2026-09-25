const express = require('express');
const requireAuth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const {
  register,
  login,
  googleLogin,
  appleLogin,
  deviceLogin,
  upgradeAccount,
  me,
  updateSettings,
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.post('/google', asyncHandler(googleLogin));
router.post('/apple', asyncHandler(appleLogin));
router.post('/device', asyncHandler(deviceLogin));
router.get('/me', requireAuth, asyncHandler(me));
router.put('/settings', requireAuth, asyncHandler(updateSettings));
router.put('/upgrade', requireAuth, asyncHandler(upgradeAccount));

module.exports = router;
