// Heroku Scheduler only offers "every 10 minutes", "hourly", or "daily" —
// there's no native monthly option. This is the job Scheduler actually
// runs (daily), but it only lets the real import through once a month, on
// IMPORT_DAY_OF_MONTH — any other day it's a no-op. Keeps the cadence this
// whole design intends (occasional, not per-user) while fitting Scheduler's
// own constraints.
const IMPORT_DAY_OF_MONTH = 1;

if (new Date().getUTCDate() !== IMPORT_DAY_OF_MONTH) {
  console.log(`اليوم مش يوم ${IMPORT_DAY_OF_MONTH} من الشهر — تخطي هالتشغيلة.`);
  process.exit(0);
}

require('./importOsmMosques');
