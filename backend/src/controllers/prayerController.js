const PrayerLog = require('../models/PrayerLog');
const { isValidDateParam } = require('../utils/date');

async function getByDate(req, res) {
  const { date } = req.params;
  if (!isValidDateParam(date)) {
    return res.status(400).json({ message: 'صيغة التاريخ غير صحيحة (YYYY-MM-DD)' });
  }

  let log = await PrayerLog.findOne({ user: req.user._id, date });
  if (!log) {
    log = await PrayerLog.create({ user: req.user._id, date });
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

  const update = { $set: { [`${group}.${key}`]: Boolean(value) } };
  const log = await PrayerLog.findOneAndUpdate(
    { user: req.user._id, date },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.json({ log });
}

module.exports = { getByDate, toggle, FARD_KEYS, NAWAFIL_KEYS };
