const QuranLog = require('../models/QuranLog');
const { isValidDateParam } = require('../utils/date');

async function getByDate(req, res) {
  const { date } = req.params;
  if (!isValidDateParam(date)) {
    return res.status(400).json({ message: 'صيغة التاريخ غير صحيحة (YYYY-MM-DD)' });
  }
  let log = await QuranLog.findOne({ user: req.user._id, date });
  if (!log) {
    try {
      log = await QuranLog.create({ user: req.user._id, date });
    } catch (err) {
      // Another request created today's log first — fetch that one
      // instead of crashing on the duplicate {user,date} index.
      if (err.code === 11000) {
        log = await QuranLog.findOne({ user: req.user._id, date });
      } else {
        throw err;
      }
    }
  }
  return res.json({ log });
}

async function toggle(req, res) {
  const { date } = req.params;
  const { completed, pagesRead } = req.body;

  if (!isValidDateParam(date)) {
    return res.status(400).json({ message: 'صيغة التاريخ غير صحيحة (YYYY-MM-DD)' });
  }

  const update = {};
  if (typeof completed === 'boolean') update.completed = completed;
  if (typeof pagesRead === 'number') update.pagesRead = pagesRead;

  let log;
  try {
    log = await QuranLog.findOneAndUpdate(
      { user: req.user._id, date },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    if (err.code === 11000) {
      log = await QuranLog.findOneAndUpdate({ user: req.user._id, date }, { $set: update }, { new: true });
    } else {
      throw err;
    }
  }

  return res.json({ log });
}

module.exports = { getByDate, toggle };
