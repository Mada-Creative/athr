const PrayerLog = require('../models/PrayerLog');
const AthkarLog = require('../models/AthkarLog');
const QuranLog = require('../models/QuranLog');
const CustomTask = require('../models/CustomTask');
const CustomTaskLog = require('../models/CustomTaskLog');
const { isValidDateParam } = require('../utils/date');
const { FARD_KEYS, NAWAFIL_KEYS } = require('./prayerController');
const { ALL_CATEGORIES: ATHKAR_CATEGORIES } = require('./athkarController');

// Fixed for every user — prayers are the foundation of the day's score,
// everything else splits the rest evenly. Not configurable, and not read
// from the user document (older accounts created before this field existed
// could have it missing entirely, which used to 500 this whole endpoint).
const FIXED_WEIGHTS = { prayers: 50, athkar: 10, quran: 10, nawafil: 10, dailyDeeds: 10, other: 10 };

/**
 * Computes the weighted daily completion percentage for one user/date,
 * using the same six fixed buckets: prayers, nawafil, dailyDeeds, athkar,
 * quran, other.
 */
async function computeDayScore(userId, date, weights = FIXED_WEIGHTS) {
  const [prayerLog, athkarLogs, quranLog, dailyDeedTasks, otherTasks, taskLogs] = await Promise.all([
    PrayerLog.findOne({ user: userId, date }),
    AthkarLog.find({ user: userId, date }),
    QuranLog.findOne({ user: userId, date }),
    CustomTask.find({ user: userId, group: 'dailyDeeds', archived: false }),
    CustomTask.find({ user: userId, group: 'other', archived: false }),
    CustomTaskLog.find({ user: userId, date }),
  ]);

  const ratio = (done, total) => (total > 0 ? done / total : 0);

  // A day marked as a legitimate Islamic excuse (menstruation/postpartum)
  // isn't a day of missed prayers — she isn't obligated to pray it, so it
  // counts as fully met rather than dragging her score or streak down.
  const excused = Boolean(prayerLog?.excused);

  const fardDone = excused
    ? FARD_KEYS.length
    : prayerLog
    ? FARD_KEYS.filter((k) => prayerLog.fard && prayerLog.fard[k]).length
    : 0;
  const nawafilDone = excused
    ? NAWAFIL_KEYS.length
    : prayerLog
    ? NAWAFIL_KEYS.filter((k) => prayerLog.nawafil && prayerLog.nawafil[k]).length
    : 0;

  const athkarDone = ATHKAR_CATEGORIES.filter((cat) => {
    const log = athkarLogs.find((l) => l.category === cat);
    return log && log.completed;
  }).length;

  const taskLogMap = new Map(taskLogs.map((l) => [l.task.toString(), l.completed]));
  const dailyDeedsDone = dailyDeedTasks.filter((t) => taskLogMap.get(t._id.toString())).length;
  const otherDone = otherTasks.filter((t) => taskLogMap.get(t._id.toString())).length;

  const buckets = {
    prayers: { ratio: ratio(fardDone, FARD_KEYS.length), weight: weights.prayers, done: fardDone, total: FARD_KEYS.length },
    nawafil: { ratio: ratio(nawafilDone, NAWAFIL_KEYS.length), weight: weights.nawafil, done: nawafilDone, total: NAWAFIL_KEYS.length },
    athkar: { ratio: ratio(athkarDone, ATHKAR_CATEGORIES.length), weight: weights.athkar, done: athkarDone, total: ATHKAR_CATEGORIES.length },
    quran: { ratio: quranLog && quranLog.completed ? 1 : 0, weight: weights.quran, done: quranLog && quranLog.completed ? 1 : 0, total: 1 },
    dailyDeeds: { ratio: ratio(dailyDeedsDone, dailyDeedTasks.length), weight: weights.dailyDeeds, done: dailyDeedsDone, total: dailyDeedTasks.length },
    other: { ratio: ratio(otherDone, otherTasks.length), weight: weights.other, done: otherDone, total: otherTasks.length },
  };

  let percentage = 0;
  for (const bucket of Object.values(buckets)) {
    percentage += bucket.ratio * bucket.weight;
  }

  return { date, percentage: Math.round(percentage), excused, buckets };
}

async function getDayStats(req, res) {
  const { date } = req.params;
  if (!isValidDateParam(date)) {
    return res.status(400).json({ message: 'صيغة التاريخ غير صحيحة (YYYY-MM-DD)' });
  }
  const result = await computeDayScore(req.user._id, date);
  return res.json(result);
}

async function getWeekStats(req, res) {
  // `endDate` should always be the CALLER's own local "today" (the mobile
  // client passes it explicitly) — the bare `new Date()` fallback below is
  // this server's own clock, which is only ever right for a client in the
  // same timezone as the server, and silently wrong near local midnight
  // for anyone else (a UTC-vs-ahead-of-UTC user could get a window that's
  // stuck one day behind — today's ring never appears, and yesterday's
  // reads as "current" instead).
  //
  // Once we have the anchor date, everything below stays in UTC
  // end-to-end (`Z` suffix on parse, `getUTCDate`/`setUTCDate`,
  // `toISOString` on the way out) so the 7-day window itself doesn't
  // depend on *this server's* timezone setting either.
  const { endDate } = req.query;
  const end = endDate && isValidDateParam(endDate) ? new Date(`${endDate}T00:00:00Z`) : new Date();

  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const results = await Promise.all(days.map((d) => computeDayScore(req.user._id, d)));
  return res.json({ days: results });
}

module.exports = { getDayStats, getWeekStats, computeDayScore };
