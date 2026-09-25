const Mosque = require('../models/Mosque');
const OsmMosque = require('../models/OsmMosque');
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

// How far the local OSM mirror's own "أقرب مسجد مني" is willing to look —
// far more generous than the community Mosque's own NEAREST_MAX_METERS
// above, since this is a single indexed query against our own database
// (fast regardless of radius), not a live external request that gets
// slower/riskier the wider it has to search.
const OSM_NEAREST_MAX_METERS = 300000;
// A single viewport query is never allowed to return an unbounded number of
// pins — a safety net for an unusually dense area (a whole big city zoomed
// out), not a limit anyone realistically hits while panning normally.
const OSM_VIEWPORT_LIMIT = 500;

function parseCoords(body) {
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

function parseBounds(query) {
  const south = Number(query.south);
  const west = Number(query.west);
  const north = Number(query.north);
  const east = Number(query.east);
  if (![south, west, north, east].every(Number.isFinite)) return null;
  if (south >= north || west >= east) return null;
  return { south, west, north, east };
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
  // Checked against our own community-approved mosques first (they're the
  // ones this app's own users vetted), then against the local OSM mirror —
  // without this second check, a mosque already visible on the map as an
  // OSM pin could still get submitted as a "new" one, since the app only
  // ever compared against its own collection before this mirror existed.
  const nearby =
    (await Mosque.findOne({
      status: 'approved',
      location: { $near: { $geometry: point, $maxDistance: DUPLICATE_RADIUS_METERS } },
    })) ||
    (await OsmMosque.findOne({
      location: { $near: { $geometry: point, $maxDistance: DUPLICATE_RADIUS_METERS } },
    }));
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

// Serves the map's viewport pins from our own local mirror of OSM's mosque
// data (see models/OsmMosque.js + scripts/importOsmMosques.js) instead of
// querying Overpass's shared public API live from every phone on every pan
// — same data, but from our own indexed database, so it's fast and never
// rate-limited or down.
async function listOsm(req, res) {
  const bounds = parseBounds(req.query);
  if (!bounds) return res.status(400).json({ message: 'حدود غير صالحة' });

  const { south, west, north, east } = bounds;
  const mosques = await OsmMosque.find({
    location: {
      $geoWithin: {
        $geometry: {
          type: 'Polygon',
          coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
        },
      },
    },
  }).limit(OSM_VIEWPORT_LIMIT);

  return res.json({ mosques: mosques.map((m) => m.toPublicJSON()) });
}

// "أقرب مسجد مني" against the local OSM mirror — one indexed $near query,
// already sorted nearest-first, no need for the tiered/widening search the
// old live-Overpass version needed (that was working around Overpass's own
// latency and reliability, neither of which apply to our own database).
async function nearestOsm(req, res) {
  const coords = parseCoords(req.query);
  if (!coords) return res.status(400).json({ message: 'موقع غير صالح' });

  const mosque = await OsmMosque.findOne({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [coords.longitude, coords.latitude] },
        $maxDistance: OSM_NEAREST_MAX_METERS,
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

module.exports = { create, listApproved, nearest, listOsm, nearestOsm, report };
