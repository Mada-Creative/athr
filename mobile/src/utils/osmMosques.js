// OpenStreetMap already has a large, free, no-API-key database of mapped
// mosques (tagged amenity=place_of_worship + religion=muslim) — querying it
// for the visible map region means most real mosques show up on the map
// automatically, and the "+" add flow is only ever needed for the ones
// missing from both OSM and our own database, not every mosque that exists.
//
// Several independently-run mirrors, not just the main instance — a device
// that consistently can't reach overpass-api.de (network filtering, that
// one instance being down/overloaded, a regional routing issue) may still
// reach a different one just fine, and retrying the *same* unreachable
// host over and over never recovers from that on its own.
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

// `region` is react-native-maps' own shape ({latitude, longitude,
// latitudeDelta, longitudeDelta}) — converted to a plain north/south/east/west
// box, which is what Overpass QL's bbox filter wants.
export function regionToBounds(region) {
  return {
    north: region.latitude + region.latitudeDelta / 2,
    south: region.latitude - region.latitudeDelta / 2,
    east: region.longitude + region.longitudeDelta / 2,
    west: region.longitude - region.longitudeDelta / 2,
  };
}

// Plain haversine, no library — used to compare a candidate from our own
// database against a candidate from OSM on equal footing (neither API
// returns a ready-made distance), and to rank OSM's own results since
// Overpass returns whatever matched an `around` radius unsorted.
const EARTH_RADIUS_M = 6371000;
export function haversineMeters(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// A hung/slow Overpass response (a shared public server, reached over
// whatever connection the phone has) must never leave "أقرب مسجد مني"
// spinning forever — this bounds every request to a fixed wall-clock time,
// after which it's treated the same as a failed request. Generous on
// purpose: Overpass legitimately takes several seconds on a normal query,
// and the earlier version of this — trying each mirror one after another,
// each with its own short timeout — could end up *slower* than a single
// patient request: abandoning the primary instance at 6s and starting a
// fresh request to a second mirror often cost more time than just waiting
// the extra couple of seconds would have, in the common case where the
// primary was going to answer anyway.
const FETCH_TIMEOUT_MS = 12000;

async function fetchOnce(url, query) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    // offline, this mirror unreachable, or it didn't answer within the
    // timeout above — either way, nothing to show from this one.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// All mirrors fired at once, not one after another — whichever answers
// first wins, so the total wait is bounded by the *fastest* mirror, not
// however many fail before a working one is tried. Only reports failure
// once every single one of them has failed.
function raceToFirstSuccess(promises) {
  return new Promise((resolve) => {
    let remaining = promises.length;
    let settled = false;
    promises.forEach((p) => {
      p.then((result) => {
        if (result && !settled) {
          settled = true;
          resolve(result);
          return;
        }
        remaining -= 1;
        if (remaining === 0 && !settled) resolve(null);
      });
    });
  });
}

async function overpassQuery(query) {
  return raceToFirstSuccess(OVERPASS_URLS.map((url) => fetchOnce(url, query)));
}

function toMosques(elements) {
  return (elements || [])
    .filter((el) => el.lat != null && el.lon != null)
    .map((el) => ({
      id: `osm-${el.id}`,
      name: el.tags?.name || el.tags?.['name:ar'] || 'مسجد',
      latitude: el.lat,
      longitude: el.lon,
      source: 'osm',
    }));
}

function closestOf(coords, candidates) {
  let nearest = candidates[0];
  let nearestDistance = haversineMeters(coords, nearest);
  for (const candidate of candidates.slice(1)) {
    const distance = haversineMeters(coords, candidate);
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }
  return { mosque: nearest, distance: nearestDistance };
}

// Starts at "same city" (covers the common case with a query still light
// enough to stay fast even somewhere as densely mapped as Damascus) and
// widens only as far as it has to. Each tier is a separate request that
// only starts once the one before it comes back empty, so fewer, bigger
// jumps mean less waiting through sequential round-trips in a sparse area
// — going straight from "10km" to "anywhere reachable by car" skips the
// slow march through several in-between radii that mostly turn up nothing
// once the immediate city has already come up empty.
const SEARCH_TIERS_METERS = [10000, 75000, 300000];

// Overpass's `around` filter does the radius search directly around a
// point (rather than a bbox), which is the shape "أقرب مسجد مني" actually
// wants — but it returns matches unsorted, so the closest one still has to
// be picked out client-side.
async function searchRadius(coords, radiusMeters) {
  // `out body 200` caps the response size as a safety net in case a
  // radius still lands in an unusually dense area — plenty of candidates
  // to find the true nearest one, never an unbounded payload.
  const query = `[out:json][timeout:8];node["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusMeters},${coords.latitude},${coords.longitude});out body 200;`;
  const data = await overpassQuery(query);
  if (!data) return undefined; // the request itself failed/timed out
  const candidates = toMosques(data.elements);
  if (!candidates.length) return null; // request succeeded, genuinely nothing here
  return closestOf(coords, candidates);
}

export async function fetchNearestOsmMosque(coords, maxRadiusMeters = SEARCH_TIERS_METERS[SEARCH_TIERS_METERS.length - 1]) {
  // Each searchRadius call already tries every Overpass mirror on its own
  // (see overpassQuery) before reporting failure, so a tier failing here
  // means none of them answered — worth widening to the next tier still
  // (a wider `around` query is a different request, might succeed where a
  // smaller one at the same point timed out), just not worth re-asking
  // the same failed tier again immediately.
  for (const radius of SEARCH_TIERS_METERS) {
    if (radius > maxRadiusMeters) break;
    const result = await searchRadius(coords, radius);
    if (result) return result;
  }
  return null;
}

export async function fetchOsmMosques(bounds) {
  const query = `[out:json][timeout:8];node["amenity"="place_of_worship"]["religion"="muslim"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});out body 300;`;
  const data = await overpassQuery(query);
  if (!data) return null; // failed/timed out — caller decides whether to retry
  return toMosques(data.elements);
}
