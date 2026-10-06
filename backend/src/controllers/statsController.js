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

  // total===0 only ever happens for dailyDeeds/other (the two buckets
  // backed by the user's own custom task list, not a fixed set like the 5
  // prayers) — someone who never added a single custom task has nothing
  // in that bucket at all. Two wrong ways to handle that, both tried and
  // both reverted:
  //   - Score it as 0/0 → ratio 0: silently caps the score at (100 minus
  //     that bucket's weight) forever, no matter what else gets done —
  //     the original bug report.
  //   - Score it as "fully met" (ratio 1) just because it's empty: hands
  //     out that bucket's weight as free credit even on a day where
  //     nothing at all was done yet — the very next bug report, a 10%
  //     starting score on a brand new day with a blank "أخرى" list.
  // Correct answer is neither: a bucket nobody's using isn't applicable
  // today, so it's excluded from the score entirely and the remaining
  // buckets' weights are re-normalized to still span the full 0-100 —
  // same shape as the excused-day carve-out (not obligated → not
  // counted against you), just without auto-crediting an unused feature.
  let earned = 0;
  let weightSum = 0;
  for (const bucket of Object.values(buckets)) {
    if (bucket.total === 0) continue;
    earned += bucket.ratio * bucket.weight;
    weightSum += bucket.weight;
  }
  const percentage = weightSum > 0 ? (earned / weightSum) * 100 : 0;

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

// Every calendar day from `start` to `end` (both YYYY-MM-DD, inclusive),
// walked in UTC like the rest of this file so it doesn't depend on the
// server's own timezone.
function dateRange(start, end) {
  const dates = [];
  const d = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (d <= last) {
    dates.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}

// Longest-ever run and the run still active today, for any yes/no
// "fully done" predicate over `dates` (chronological). A day that isn't
// done *yet* only breaks today's streak if it's not actually today —
// otherwise "لسا ما صليت العصر الساعة 2" would zero out an ongoing streak
// mid-day, which isn't what anyone reading "المداومة الحالية" expects.
function computeStreaks(dates, today, isDone) {
  let best = 0;
  let run = 0;
  for (const date of dates) {
    if (isDone(date)) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }

  let current = 0;
  for (let i = dates.length - 1; i >= 0; i -= 1) {
    const date = dates[i];
    if (isDone(date)) {
      current += 1;
      continue;
    }
    if (date === today) continue; // today not done yet — keep looking back, don't break
    break;
  }
  return { current, best };
}

// The detailed breakdown behind "الإحصائيات": streaks (overall + per
// section), per-item percentages, a day-of-week average, and a 14-day
// prayer calendar — everything the simple 7-day `getWeekStats` above
// doesn't cover. Needs the user's *whole* history rather than a fixed
// window, so it's built around a handful of bulk queries (one per
// collection, covering every date at once) instead of a loop calling
// computeDayScore per day, which would re-query the same collections
// hundreds of times over for anyone with more than a few weeks of data.
//
// One deliberate simplification: the "مسار الإنجاز اليومي" / "المعدل حسب
// اليوم" charts here score each day from only prayers + nawafil + athkar +
// quran (re-normalized over those four, same way computeDayScore already
// does when a bucket is empty) — custom tasks (dailyDeeds/other) are left
// out, since they'd each need their own per-day join across the whole
// history. For most users that matches the real daily % exactly (an empty
// custom-task bucket is excluded from computeDayScore's own weighting
// too); for someone with custom tasks it's a close approximation, not the
// literal number shown on Tracker/Home.
async function getOverviewStats(req, res) {
  const userId = req.user._id;
  const today = todayISO();

  const [prayerLogs, athkarLogs, quranLogs, dailyDeedTasks, otherTasks] = await Promise.all([
    PrayerLog.find({ user: userId }).sort({ date: 1 }),
    AthkarLog.find({ user: userId }).sort({ date: 1 }),
    QuranLog.find({ user: userId }).sort({ date: 1 }),
    CustomTask.countDocuments({ user: userId, group: 'dailyDeeds', archived: false }),
    CustomTask.countDocuments({ user: userId, group: 'other', archived: false }),
  ]);

  const firstDates = [prayerLogs[0]?.date, athkarLogs[0]?.date, quranLogs[0]?.date].filter(Boolean);
  if (firstDates.length === 0) {
    return res.json({ hasData: false });
  }
  const firstDate = firstDates.reduce((min, d) => (d < min ? d : min));
  const dates = dateRange(firstDate, today);

  // A day with nothing logged at all doesn't count against (or for) any
  // percentage — "لم تُسجَّل فيه عبادات" is excluded, not scored as 0%, so a
  // week away from the app doesn't quietly tank the numbers. Streaks are
  // unaffected by this: an unlogged day still isn't a "done" day, so it
  // still ends a streak either way. `dates` (every calendar day since
  // `firstDate`) is still used as-is for the streak scan and the daily
  // trend line, where a visible gap is the honest picture.
  const loggedDates = new Set([...prayerLogs, ...athkarLogs, ...quranLogs].map((l) => l.date));
  const totalDaysTracked = loggedDates.size;

  const prayerByDate = new Map(prayerLogs.map((l) => [l.date, l]));
  const quranByDate = new Map(quranLogs.map((l) => [l.date, l]));

  // date -> { category -> completed }, so both the full-ALL_CATEGORIES
  // bucket (for the day score, matching computeDayScore) and the
  // morning/evening/sleep-only breakdown below can read from one pass.
  const athkarByDate = new Map();
  for (const log of athkarLogs) {
    if (!athkarByDate.has(log.date)) athkarByDate.set(log.date, {});
    athkarByDate.get(log.date)[log.category] = log.completed;
  }

  const isFardDone = (date) => {
    const log = prayerByDate.get(date);
    if (!log) return false;
    return log.excused || FARD_KEYS.every((k) => log.fard?.[k]);
  };
  const isNawafilDone = (date) => {
    const log = prayerByDate.get(date);
    if (!log) return false;
    return log.excused || NAWAFIL_KEYS.every((k) => log.nawafil?.[k]);
  };
  const DAILY_ATHKAR = ['morning', 'evening', 'sleep'];
  const isDailyAthkarDone = (date) => {
    const cats = athkarByDate.get(date);
    return Boolean(cats) && DAILY_ATHKAR.every((c) => cats[c]);
  };
  const isQuranDone = (date) => Boolean(quranByDate.get(date)?.completed);

  const prayerStreaks = computeStreaks(dates, today, isFardDone);
  const nawafilStreaks = computeStreaks(dates, today, isNawafilDone);
  const athkarStreaks = computeStreaks(dates, today, isDailyAthkarDone);
  const quranStreaks = computeStreaks(dates, today, isQuranDone);

  const loggedList = [...loggedDates];
  const pct = (count) => (totalDaysTracked > 0 ? Math.round((count / totalDaysTracked) * 100) : 0);

  const perPrayerPct = {};
  for (const key of FARD_KEYS) {
    const count = loggedList.filter((d) => prayerByDate.get(d)?.excused || prayerByDate.get(d)?.fard?.[key]).length;
    perPrayerPct[key] = pct(count);
  }

  const perNawafilPct = {};
  for (const key of NAWAFIL_KEYS) {
    const count = loggedList.filter((d) => prayerByDate.get(d)?.excused || prayerByDate.get(d)?.nawafil?.[key]).length;
    perNawafilPct[key] = pct(count);
  }

  const perAthkarPct = {};
  for (const cat of DAILY_ATHKAR) {
    perAthkarPct[cat] = pct(loggedList.filter((d) => athkarByDate.get(d)?.[cat]).length);
  }

  const wirdPct = pct(loggedList.filter((d) => quranByDate.get(d)?.completed).length);

  // سورة الكهف only applies on Fridays, so its percentage is out of
  // *logged* Fridays, same "untouched days don't count" rule as every
  // other percentage here — out of every Friday since `firstDate`
  // regardless of use would make a perfect record look like ~14%.
  const loggedFridays = loggedList.filter((d) => new Date(`${d}T00:00:00Z`).getUTCDay() === 5);
  const kahfCount = loggedFridays.filter((d) => quranByDate.get(d)?.kahfRead).length;
  const kahfPct = loggedFridays.length > 0 ? Math.round((kahfCount / loggedFridays.length) * 100) : 0;

  // Per-day weighted score (see the function-level comment above for why
  // this four-bucket version, not a full computeDayScore call, per day).
  const dayPercentage = (date) => {
    const prayerLog = prayerByDate.get(date);
    const excused = Boolean(prayerLog?.excused);
    const fardDone = excused ? FARD_KEYS.length : prayerLog ? FARD_KEYS.filter((k) => prayerLog.fard?.[k]).length : 0;
    const nawafilDone = excused
      ? NAWAFIL_KEYS.length
      : prayerLog
      ? NAWAFIL_KEYS.filter((k) => prayerLog.nawafil?.[k]).length
      : 0;
    const athkarCats = athkarByDate.get(date) || {};
    const athkarDone = ATHKAR_CATEGORIES.filter((c) => athkarCats[c]).length;
    const quranDone = isQuranDone(date) ? 1 : 0;

    const buckets = [
      { ratio: fardDone / FARD_KEYS.length, weight: FIXED_WEIGHTS.prayers },
      { ratio: nawafilDone / NAWAFIL_KEYS.length, weight: FIXED_WEIGHTS.nawafil },
      { ratio: athkarDone / ATHKAR_CATEGORIES.length, weight: FIXED_WEIGHTS.athkar },
      { ratio: quranDone, weight: FIXED_WEIGHTS.quran },
    ];
    const earned = buckets.reduce((s, b) => s + b.ratio * b.weight, 0);
    const weightSum = buckets.reduce((s, b) => s + b.weight, 0);
    return Math.round((earned / weightSum) * 100);
  };

  // The trend line (`dailySeries`) walks every calendar day, untouched
  // ones included as a real 0% — hiding a quiet week from the line itself
  // would misleadingly stitch the days on either side of it together.
  // `overallAverage`/`weekdayAverage` are summaries though, so they follow
  // the same "untouched days don't count" rule as the percentages above.
  const weekdaySums = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }));
  const dailySeries = dates.map((date) => ({ date, percentage: dayPercentage(date) }));

  let overallSum = 0;
  for (const date of loggedList) {
    const p = dayPercentage(date);
    overallSum += p;
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0=Sunday..6=Saturday
    weekdaySums[dow].sum += p;
    weekdaySums[dow].count += 1;
  }
  const overallAverage = totalDaysTracked > 0 ? Math.round(overallSum / totalDaysTracked) : 0;
  const weekdayAverage = weekdaySums.map(({ sum, count }) => (count > 0 ? Math.round(sum / count) : 0));
  // Capped to the most recent stretch — "مسار الإنجاز اليومي" reads as a
  // recent trend line, not a multi-year sprawl that'd need horizontal
  // scrolling to see a single point.
  const DAILY_SERIES_WINDOW = 30;
  const recentDailySeries = dailySeries.slice(-DAILY_SERIES_WINDOW);

  const last14Days = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - i);
    const date = d.toISOString().slice(0, 10);
    const log = prayerByDate.get(date);
    last14Days.push({
      date,
      logged: Boolean(log),
      excused: Boolean(log?.excused),
      doneCount: log ? FARD_KEYS.filter((k) => log.fard?.[k]).length : 0,
    });
  }

  return res.json({
    hasData: true,
    totalDaysTracked,
    hasCustomTasks: dailyDeedTasks > 0 || otherTasks > 0,
    overallAverage,
    bestStreak: prayerStreaks.best,
    currentStreak: prayerStreaks.current,
    categoryStreaks: {
      prayers: prayerStreaks,
      nawafil: nawafilStreaks,
      athkar: athkarStreaks,
      quran: quranStreaks,
    },
    perPrayerPct,
    perNawafilPct,
    perAthkarPct,
    quran: { wirdPct, kahfPct },
    weekdayAverage,
    last14Days,
    dailySeries: recentDailySeries,
  });
}

module.exports = { getDayStats, getWeekStats, getOverviewStats, computeDayScore };
