const CustomTask = require('../models/CustomTask');
const CustomTaskLog = require('../models/CustomTaskLog');
const { isValidDateParam } = require('../utils/date');

async function list(req, res) {
  const { group } = req.query;
  const filter = { user: req.user._id, archived: false };
  if (group) filter.group = group;
  const tasks = await CustomTask.find(filter).sort({ createdAt: 1 });
  return res.json({ tasks });
}

async function create(req, res) {
  const { group, title, description, icon } = req.body;
  if (!group || !['dailyDeeds', 'other'].includes(group)) {
    return res.status(400).json({ message: 'المجموعة يجب أن تكون dailyDeeds أو other' });
  }
  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'العنوان مطلوب' });
  }

  const task = await CustomTask.create({
    user: req.user._id,
    group,
    title: title.trim(),
    description: description || '',
    icon: icon || 'sparkles',
  });
  return res.status(201).json({ task });
}

async function remove(req, res) {
  const task = await CustomTask.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { archived: true },
    { new: true }
  );
  if (!task) return res.status(404).json({ message: 'العنصر غير موجود' });
  return res.json({ task });
}

async function getLogsByDate(req, res) {
  const { date } = req.params;
  if (!isValidDateParam(date)) {
    return res.status(400).json({ message: 'صيغة التاريخ غير صحيحة (YYYY-MM-DD)' });
  }
  const logs = await CustomTaskLog.find({ user: req.user._id, date });
  return res.json({ logs });
}

async function toggleLog(req, res) {
  const { date, taskId } = req.params;
  const { completed } = req.body;

  if (!isValidDateParam(date)) {
    return res.status(400).json({ message: 'صيغة التاريخ غير صحيحة (YYYY-MM-DD)' });
  }
  const task = await CustomTask.findOne({ _id: taskId, user: req.user._id });
  if (!task) return res.status(404).json({ message: 'العنصر غير موجود' });

  const log = await CustomTaskLog.findOneAndUpdate(
    { user: req.user._id, task: taskId, date },
    { $set: { completed: Boolean(completed) } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return res.json({ log });
}

module.exports = { list, create, remove, getLogsByDate, toggleLog };
