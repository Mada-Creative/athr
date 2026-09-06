const express = require('express');
const requireAuth = require('../middleware/auth');
const { register, login, googleLogin, appleLogin, me, updateSettings } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/apple', appleLogin);
router.get('/me', requireAuth, me);
router.put('/settings', requireAuth, updateSettings);

module.exports = router;
