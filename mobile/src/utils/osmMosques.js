// OpenStreetMap already has a large, free, no-API-key database of mapped
// mosques (tagged amenity=place_of_worship + religion=muslim) — querying it
// for the visible map region means most real mosques show up on the map
// automatically, and the "+" add flow is only ever needed for the ones
// missing from both OSM and our own database, not every mosque that exists.
//
// This used to query Overpass's shared public API directly from every
// phone, on every pan/zoom — slow, and easy to accidentally overload/get
// rate-limited by (a free, keyless, shared service). Now it's a plain call
// to our own backend, which keeps a local, periodically-refreshed mirror of
// the same OSM data in our own indexed database (see backend's OsmMosque
// model + src/scripts/importOsmMosques.js) — same data, our own reliable
// server, no external dependency in the loop for every map interaction.
import { api } from '../api/client';

// `region` is react-native-maps' own shape ({latitude, longitude,
// latitudeDelta, longitudeDelta}) — converted to a plain north/south/east/west
// box, which is what the backend's own OSM endpoints want.
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
// returns a ready-made distance), and to rank/format results client-side.
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

export async function fetchOsmMosques(bounds) {
  try {
    const res = await api.get(
      `/mosques/osm?south=${bounds.south}&west=${bounds.west}&north=${bounds.north}&east=${bounds.east}`
    );
    return res.mosques;
  } catch (err) {
    return null; // failed/timed out — caller decides whether to retry
  }
}

export async function fetchNearestOsmMosque(coords) {
  try {
    const res = await api.get(`/mosques/osm/nearest?latitude=${coords.latitude}&longitude=${coords.longitude}`);
    if (!res.mosque) return null;
    return { mosque: res.mosque, distance: haversineMeters(coords, res.mosque) };
  } catch (err) {
    return null;
  }
}
