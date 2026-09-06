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

  const filter = { user: req.user._id, task: taskId, date };
  const update = { $set: { completed: Boolean(completed) } };
  let log;
  try {
    log = await CustomTaskLog.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
  } catch (err) {
    // Another request created today's log for this task first — apply
    // this toggle as a plain update instead of crashing on the duplicate
    // {user,task,date} index.
    if (err.code !== 11000) throw err;
    log = await CustomTaskLog.findOneAndUpdate(filter, update, { new: true });
  }
  return res.json({ log });
}

module.exports = { list, create, remove, getLogsByDate, toggleLog };
