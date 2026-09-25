// Gates the mosque-review admin endpoints behind a single shared secret
// (ADMIN_TOKEN) instead of a real user/role system — there's exactly one
// person reviewing submissions today (see Mosque.js), so a login flow and
// a role field on User would be pure overhead for what this actually is:
// a password on a small internal tool.
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!process.env.ADMIN_TOKEN) {
    return res.status(500).json({ message: 'ADMIN_TOKEN غير مُعرّف على الخادم' });
  }
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ message: 'رمز الإدارة غير صحيح' });
  }
  next();
}

module.exports = requireAdmin;
