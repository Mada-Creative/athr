const PrayerLog = require('../models/PrayerLog');
const { isValidDateParam } = require('../utils/date');

async function getByDate(req, res) {
  const { date } = req.params;
  if (!isValidDateParam(date)) {
    return res.status(400).json({ message: 'صيغة التاريخ غير صحيحة (YYYY-MM-DD)' });
  }

  let log = await PrayerLog.findOne({ user: req.user._id, date });
  if (!log) {
    try {
      log = await PrayerLog.create({ user: req.user._id, date });
    } catch (err) {
      // Two requests racing to create today's first log both pass the
      // findOne check above; the loser hits the unique {user,date} index
      // instead of crashing the process — the winner's doc is what we want.
      if (err.code === 11000) {
        log = await PrayerLog.findOne({ user: req.user._id, date });
      } else {
        throw err;
      }
    }
  }
  return res.json({ log });
}

const FARD_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const NAWAFIL_KEYS = [
  'fajrSunnah',
  'dhuhrQabliyah',
  'dhuhrBadiyah',
  'maghribSunnah',
  'ishaSunnah',
  'qiyam',
  'witr',
];

async function toggle(req, res) {
  const { date } = req.params;
  const { group, key, value } = req.body;

  if (!isValidDateParam(date)) {
    return res.status(400).json({ message: 'صيغة التاريخ غير صحيحة (YYYY-MM-DD)' });
  }
  if (group !== 'fard' && group !== 'nawafil') {
    return res.status(400).json({ message: 'المجموعة يجب أن تكون fard أو nawafil' });
  }
  const validKeys = group === 'fard' ? FARD_KEYS : NAWAFIL_KEYS;
  if (!validKeys.includes(key)) {
    return res.status(400).json({ message: `عنصر غير معروف: ${key}` });
  }

  const existing = await PrayerLog.findOne({ user: req.user._id, date });
  if (existing?.excused) {
    return res.status(400).json({ message: 'اليوم مسجَّل كعذر شرعي — لا يمكن تعديل الصلوات فيه' });
  }

  const update = { $set: { [`${group}.${key}`]: Boolean(value) } };
  let log;
  try {
    log = await PrayerLog.findOneAndUpdate({ user: req.user._id, date }, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
  } catch (err) {
    // Same race as above, this time between this upsert and another
    // request creating today's log first — retry as a plain update now
    // that the document is guaranteed to exist.
    if (err.code === 11000) {
      log = await PrayerLog.findOneAndUpdate({ user: req.user._id, date }, update, { new: true });
    } else {
      throw err;
    }
  }

  return res.json({ log });
}

async function setExcused(req, res) {
  const { date } = req.params;
  const { excused } = req.body;

  if (!isValidDateParam(date)) {
    return res.status(400).json({ message: 'صيغة التاريخ غير صحيحة (YYYY-MM-DD)' });
  }
  if (typeof excused !== 'boolean') {
    return res.status(400).json({ message: 'قيمة excused يجب أن تكون true أو false' });
  }

  const update = { $set: { excused } };
  let log;
  try {
    log = await PrayerLog.findOneAndUpdate({ user: req.user._id, date }, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
  } catch (err) {
    if (err.code === 11000) {
      log = await PrayerLog.findOneAndUpdate({ user: req.user._id, date }, update, { new: true });
    } else {
      throw err;
    }
  }

  return res.json({ log });
}

module.exports = { getByDate, toggle, setExcused, FARD_KEYS, NAWAFIL_KEYS };
