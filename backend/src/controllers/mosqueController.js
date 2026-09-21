const Mosque = require('../models/Mosque');
const { notifyAdmin } = require('../utils/mailer');

// Anything closer than this to an already-approved mosque is treated as
// the same mosque, not a new one — stops the map from filling up with
// near-duplicate pins for the same building from different submitters.
const DUPLICATE_RADIUS_METERS = 150;

// How far "أقرب مسجد مني" is willing to look before saying there's
// genuinely nothing nearby, rather than returning a mosque an hour away.
const NEAREST_MAX_METERS = 30000;

// PUBLIC_URL lets this link stay correct if the backend ever moves off
// this Heroku app without a code change — falls back to the current host
// since that env var isn't set anywhere yet.
const ADMIN_PAGE_URL = `${process.env.PUBLIC_URL || 'https://safe-citadel-95574-87a79d0291e7.herokuapp.com'}/admin/mosques.html`;

function parseCoords(body) {
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

async function create(req, res) {
  const name = (req.body.name || '').trim();
  const city = (req.body.city || '').trim();
  const coords = parseCoords(req.body);

  if (!name) return res.status(400).json({ message: 'اسم المسجد مطلوب' });
  if (!coords) return res.status(400).json({ message: 'موقع غير صالح' });

  const point = { type: 'Point', coordinates: [coords.longitude, coords.latitude] };

  // A mosque already sitting within the duplicate radius wins over
  // creating a second pin — surfaced back to the client as a suggestion
  // rather than silently rejected, so the app can ask "هل تقصد هذا
  // المسجد؟" and let the user confirm instead of guessing on its own.
  const nearby = await Mosque.findOne({
    status: 'approved',
    location: { $near: { $geometry: point, $maxDistance: DUPLICATE_RADIUS_METERS } },
  });
  if (nearby) {
    return res.status(409).json({
      message: 'يوجد مسجد قريب مسجّل مسبقًا',
      suggestion: nearby.toPublicJSON(),
    });
  }

  const mosque = await Mosque.create({
    name,
    city,
    location: point,
    addedBy: req.user._id,
    status: 'pending',
  });

  notifyAdmin(
    'مسجد جديد بانتظار المراجعة — أثر',
    `اقترح ${req.user.name} إضافة مسجد جديد:\n\n${name}${city ? ` — ${city}` : ''}\n\nراجعه من هنا:\n${ADMIN_PAGE_URL}`
  );

  return res.status(201).json({ mosque: mosque.toPublicJSON(), status: 'pending' });
}

async function listApproved(req, res) {
  const coords = req.query.latitude != null ? parseCoords(req.query) : null;
  const query = { status: 'approved' };

  let mosques;
  if (coords) {
    // $near on a query (not just $geoNear aggregation) already sorts
    // nearest-first, which is exactly the order the map wants when it
    // has the user's own location to compare against.
    mosques = await Mosque.find({
      ...query,
      location: { $near: { $geometry: { type: 'Point', coordinates: [coords.longitude, coords.latitude] } } },
    }).limit(200);
  } else {
    mosques = await Mosque.find(query).limit(200);
  }
  return res.json({ mosques: mosques.map((m) => m.toPublicJSON()) });
}

async function nearest(req, res) {
  const coords = parseCoords(req.query);
  if (!coords) return res.status(400).json({ message: 'موقع غير صالح' });

  const mosque = await Mosque.findOne({
    status: 'approved',
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [coords.longitude, coords.latitude] },
        $maxDistance: NEAREST_MAX_METERS,
      },
    },
  });
  return res.json({ mosque: mosque ? mosque.toPublicJSON() : null });
}

async function report(req, res) {
  const reason = (req.body.reason || '').trim();
  const mosque = await Mosque.findOneAndUpdate(
    { _id: req.params.id, status: 'approved' },
    { $push: { reports: { user: req.user._id, reason } } },
    { new: true }
  );
  if (!mosque) return res.status(404).json({ message: 'المسجد غير موجود' });

  notifyAdmin(
    'بلاغ عن مسجد — أثر',
    `أبلغ ${req.user.name} عن مسجد "${mosque.name}"${reason ? `:\n\n${reason}` : ' (بدون سبب محدد)'}\n\nراجعه من هنا:\n${ADMIN_PAGE_URL}`
  );

  return res.json({ ok: true });
}

module.exports = { create, listApproved, nearest, report };
