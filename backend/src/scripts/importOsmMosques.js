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
// A short, polite pause between regions rather than firing the next request
// the instant one finishes — this script is the one place allowed to hit
// Overpass at all, so it should still behave like a considerate, infrequent
// client rather than hammering it region after region with no gap.
const DELAY_BETWEEN_REGIONS_MS = 3000;

async function fetchRegion(bbox) {
  const query = `[out:json][timeout:150];node["amenity"="place_of_worship"]["religion"="muslim"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});out body;`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Requests from a plain server-side fetch (no Accept/User-Agent, as
        // Node's fetch sends by default) get rejected with 406 by Overpass —
        // both headers below are what a browser or the phone's own fetch
        // sends automatically, and Overpass's own usage policy asks for a
        // descriptive User-Agent identifying the app anyway.
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  await connectDB();

  let totalSeen = 0;
  let totalNew = 0;
  let failedRegions = [];

  for (const region of REGIONS) {
    process.stdout.write(`${region.name}... `);
    try {
      const elements = await fetchRegion(region.bbox);
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
        console.log(`${ops.length} مسجد (${result.upsertedCount} جديد)`);
      } else {
        console.log('لا يوجد');
      }
    } catch (err) {
      console.log(`فشل: ${err.message}`);
      failedRegions.push(region.name);
    }

    await sleep(DELAY_BETWEEN_REGIONS_MS);
  }

  console.log(`\nتم. إجمالي: ${totalSeen} مسجد (${totalNew} جديد).`);
  if (failedRegions.length) {
    console.log(`فشلت هذه المناطق ورح تحتاج إعادة تشغيل السكربت: ${failedRegions.join('، ')}`);
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
