const AthkarLog = require('../models/AthkarLog');
const athkarContent = require('../data/athkarContent');
const { isValidDateParam } = require('../utils/date');

function getContent(req, res) {
  return res.json({ content: athkarContent });
}

async function getByDate(req, res) {
  const { date } = req.params;
  if (!isValidDateParam(date)) {
    return res.status(400).json({ message: 'صيغة التاريخ غير صحيحة (YYYY-MM-DD)' });
  }

  const logs = await AthkarLog.find({ user: req.user._id, date });
  const byCategory = {};
  for (const category of Object.keys(athkarContent)) {
    const existing = logs.find((l) => l.category === category);
    byCategory[category] = existing
      ? {
          completedItems: existing.completedItems,
          totalItems: athkarContent[category].items.length,
          completed: existing.completed,
        }
      : { completedItems: [], totalItems: athkarContent[category].items.length, completed: false };
  }

  return res.json({ date, categories: byCategory });
}

async function updateProgress(req, res) {
  const { date, category } = req.params;
  const { itemIndex, completed } = req.body;

  if (!isValidDateParam(date)) {
    return res.status(400).json({ message: 'صيغة التاريخ غير صحيحة (YYYY-MM-DD)' });
  }
  const definition = athkarContent[category];
  if (!definition) {
    return res.status(400).json({ message: 'تصنيف أذكار غير معروف' });
  }

  let log = await AthkarLog.findOne({ user: req.user._id, date, category });
  if (!log) {
    log = new AthkarLog({
      user: req.user._id,
      date,
      category,
      totalItems: definition.items.length,
      completedItems: [],
    });
  }

  if (typeof itemIndex === 'number') {
    const set = new Set(log.completedItems);
    if (set.has(itemIndex)) set.delete(itemIndex);
    else set.add(itemIndex);
    log.completedItems = Array.from(set).sort((a, b) => a - b);
    log.completed = log.completedItems.length >= definition.items.length;
  } else if (typeof completed === 'boolean') {
    log.completed = completed;
    log.completedItems = completed
      ? Array.from({ length: definition.items.length }, (_, i) => i)
      : [];
  }

  log.totalItems = definition.items.length;
  await log.save();

  return res.json({
    category,
    completedItems: log.completedItems,
    totalItems: log.totalItems,
    completed: log.completed,
  });
}

module.exports = { getContent, getByDate, updateProgress };
