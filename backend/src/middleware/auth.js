const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'لا يوجد رمز دخول (token) صالح' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({ message: 'المستخدم غير موجود' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'جلسة الدخول غير صالحة أو منتهية' });
  }
}

module.exports = requireAuth;
