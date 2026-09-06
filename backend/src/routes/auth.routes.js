const express = require('express');
const requireAuth = require('../middleware/auth');
const { register, login, me, updateSettings } = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, me);
router.put('/settings', requireAuth, updateSettings);

module.exports = router;
