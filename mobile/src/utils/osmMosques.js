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
