// One-off/periodic batch job: pulls every mapped mosque (amenity=place_of_
// worship + religion=muslim) from OpenStreetMap's Overpass API into our own
// OsmMosque collection, region by region (see data/osmImportRegions.js).
//
// This is the only thing in the whole app still allowed to hit Overpass
// directly — it runs rarely (manually, or on a schedule — see README), not
// once per user per map interaction, so there's no risk of it rate-limiting
// or overloading Overpass's free public server the way querying it live from
// every phone did. Run it with `npm run import:osm-mosques`, then again
// every so often (e.g. monthly, via Heroku Scheduler) to pick up new/edited
// mosques on OSM.
require('dotenv').config();
const connectDB = require('../config/db');
const OsmMosque = require('../models/OsmMosque');
const REGIONS = require('../data/osmImportRegions');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
// Generous — a country-sized query over a densely-mapped area can
// legitimately take a while, and unlike the live in-app search, nothing is
// waiting on this to finish quickly.
const FETCH_TIMEOUT_MS = 180000;
// A short, polite pause between requests rather than firing the next one
// the instant one finishes — this script is the one place allowed to hit
// Overpass at all, so it should still behave like a considerate, infrequent
// client rather than hammering it request after request with no gap.
const DELAY_BETWEEN_REQUESTS_MS = 6000;
// Overpass returns 429 once it decides a client is asking too much too
// fast, and 504 when a single query took too long for its own front-end
// proxy's patience — both are worth waiting out and trying again, growing
// the wait each time, rather than giving up right away.
const RETRY_DELAYS_MS = [8000, 20000, 45000];
// Once every retry above is exhausted, a still-failing request is assumed
// to be too big/heavy for Overpass to answer in one go (a 504 after a
// densely-mapped country's *whole* bbox, say) rather than just bad luck —
// splitting it in half and asking for each half separately, fresh retry
// budget and all, usually gets past that. Stops once a half is this small,
// so a genuinely broken query doesn't recurse forever over a tiny area.
const MIN_SPLIT_DEG = 0.5;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function splitBboxOnce(bbox) {
  const { south, west, north, east } = bbox;
  if (north - south >= east - west) {
    const midLat = (south + north) / 2;
    return [
      { south, west, north: midLat, east },
      { south: midLat, west, north, east },
    ];
  }
  const midLon = (west + east) / 2;
  return [
    { south, west, north, east: midLon },
    { south, west: midLon, north, east },
  ];
}

async function fetchTile(bbox) {
  const query = `[out:json][timeout:150];node["amenity"="place_of_worship"]["religion"="muslim"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});out body;`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // A plain server-side fetch (no Accept/User-Agent, as Node's fetch
        // sends by default) gets rejected outright with 406 by Overpass —
        // both headers below are what a browser or the phone's own fetch
        // sends automatically, and Overpass's own usage policy also asks
        // for a descriptive User-Agent identifying the app.
        Accept: '*/*',
        'User-Agent': 'AtharApp/1.0 (prayer & athkar tracking app; mosque map feature)',
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.elements || [];
  } finally {
    clearTimeout(timeout);
  }
}

// Retries the same bbox a few times, waiting longer each time, before
// falling back to splitting it — a 429/504/dropped-connection is Overpass
// asking for patience, not necessarily a reason to split right away.
async function fetchTileWithRetry(bbox, label) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fetchTile(bbox);
    } catch (err) {
      if (attempt >= RETRY_DELAYS_MS.length) throw err;
      const delay = RETRY_DELAYS_MS[attempt];
      console.log(`  ${label}: ${err.message} — إعادة محاولة بعد ${delay / 1000} ثانية`);
      await sleep(delay);
    }
  }
}

// Fetches one bbox, splitting it and recursing on failure instead of giving
// up on the whole area — handles both "this country is huge" (a big bbox
// genuinely takes too long) and "this small area is unusually dense" (e.g.
// Syria, which failed even at its normal, modest size) with the same
// mechanism: if it doesn't answer, ask for less at a time.
async function fetchRegion(bbox, label) {
  await sleep(DELAY_BETWEEN_REQUESTS_MS);
  process.stdout.write(`${label}... `);
  try {
    const elements = await fetchTileWithRetry(bbox, label);
    console.log(`${elements.length} عنصر`);
    return elements;
  } catch (err) {
    const tooSmallToSplit = Math.max(bbox.north - bbox.south, bbox.east - bbox.west) <= MIN_SPLIT_DEG;
    if (tooSmallToSplit) {
      console.log(`فشل نهائيًا: ${err.message}`);
      throw err;
    }
    console.log(`${err.message} — بقسّم المنطقة لنصين`);
    // One half at a time, never both at once — the whole point of this
    // script existing is being a single, polite, sequential client; firing
    // two halves concurrently would be exactly the kind of parallel-request
    // pattern that got the live in-app search rate-limited earlier.
    const [a, b] = splitBboxOnce(bbox);
    let elementsA = [];
    let elementsB = [];
    let aFailed = false;
    let bFailed = false;
    try {
      elementsA = await fetchRegion(a, `${label}أ`);
    } catch (errA) {
      aFailed = true;
    }
    try {
      elementsB = await fetchRegion(b, `${label}ب`);
    } catch (errB) {
      bFailed = true;
    }
    if (aFailed && bFailed) throw err;
    return [...elementsA, ...elementsB];
  }
}

async function run() {
  await connectDB();

  let totalSeen = 0;
  let totalNew = 0;
  const failedRegions = [];

  for (const region of REGIONS) {
    let elements;
    try {
      elements = await fetchRegion(region.bbox, region.name);
    } catch (err) {
      failedRegions.push(region.name);
      continue;
    }

    const ops = elements
      .filter((el) => el.lat != null && el.lon != null)
      .map((el) => ({
        updateOne: {
          filter: { osmId: el.id },
          update: {
            $set: {
              osmId: el.id,
              name: el.tags?.name || el.tags?.['name:ar'] || '',
              location: { type: 'Point', coordinates: [el.lon, el.lat] },
            },
          },
          upsert: true,
        },
      }));

    if (ops.length) {
      const result = await OsmMosque.bulkWrite(ops);
      totalSeen += ops.length;
      totalNew += result.upsertedCount;
      console.log(`${region.name}: إجمالي ${ops.length} مسجد (${result.upsertedCount} جديد)\n`);
    } else {
      console.log(`${region.name}: لا يوجد\n`);
    }
  }

  console.log(`تم. إجمالي: ${totalSeen} مسجد (${totalNew} جديد).`);
  if (failedRegions.length) {
    console.log(`فشلت هذه المناطق بالكامل ورح تحتاج إعادة تشغيل السكربت: ${failedRegions.join('، ')}`);
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
