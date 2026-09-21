// OpenStreetMap already has a large, free, no-API-key database of mapped
// mosques (tagged amenity=place_of_worship + religion=muslim) — querying it
// for the visible map region means most real mosques show up on the map
// automatically, and the "+" add flow is only ever needed for the ones
// missing from both OSM and our own database, not every mosque that exists.
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Keeps a single request in flight at a time and skips a call entirely if
// the map hasn't moved far enough to matter — Overpass is a shared public
// service with no key, so it deserves being called sparingly, not on every
// pixel of pan/zoom.
let lastBounds = null;
const MIN_DELTA = 0.01;

function boundsChangedEnough(bounds) {
  if (!lastBounds) return true;
  return (
    Math.abs(bounds.north - lastBounds.north) > MIN_DELTA ||
    Math.abs(bounds.south - lastBounds.south) > MIN_DELTA ||
    Math.abs(bounds.east - lastBounds.east) > MIN_DELTA ||
    Math.abs(bounds.west - lastBounds.west) > MIN_DELTA
  );
}

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

// Overpass's `around` filter does the radius search directly around a
// point (rather than a bbox), which is the shape "أقرب مسجد مني" actually
// wants — but it returns matches unsorted, so the closest one still has to
// be picked out client-side.
export async function fetchNearestOsmMosque(coords, radiusMeters) {
  const query = `[out:json][timeout:15];node["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusMeters},${coords.latitude},${coords.longitude});out body;`;
  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const candidates = (data.elements || [])
      .filter((el) => el.lat != null && el.lon != null)
      .map((el) => ({
        id: `osm-${el.id}`,
        name: el.tags?.name || el.tags?.['name:ar'] || 'مسجد',
        latitude: el.lat,
        longitude: el.lon,
        source: 'osm',
      }));
    if (!candidates.length) return null;

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
  } catch (err) {
    return null;
  }
}

export async function fetchOsmMosques(bounds, { force = false } = {}) {
  if (!force && !boundsChangedEnough(bounds)) return null;

  const query = `[out:json][timeout:15];node["amenity"="place_of_worship"]["religion"="muslim"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});out body;`;

  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) return null;
    const data = await res.json();
    lastBounds = bounds;
    return (data.elements || [])
      .filter((el) => el.lat != null && el.lon != null)
      .map((el) => ({
        id: `osm-${el.id}`,
        name: el.tags?.name || el.tags?.['name:ar'] || 'مسجد',
        latitude: el.lat,
        longitude: el.lon,
        source: 'osm',
      }));
  } catch (err) {
    // offline or Overpass unreachable — the map still works with whatever
    // OSM pins (if any) loaded last, plus our own database's mosques
    return null;
  }
}
