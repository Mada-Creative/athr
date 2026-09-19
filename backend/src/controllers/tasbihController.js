const TasbihCounter = require('../models/TasbihCounter');

async function list(req, res) {
  const counters = await TasbihCounter.find({ user: req.user._id }).sort({ updatedAt: -1 });
  return res.json({ counters });
}

async function create(req, res) {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ message: 'نص الذكر مطلوب' });
  }

  // Reuse an existing counter with the same text rather than creating a
  // duplicate — picking "سبحان الله" twice should count on the same tally.
  let counter = await TasbihCounter.findOne({ user: req.user._id, text: text.trim() });
  if (!counter) {
    counter = await TasbihCounter.create({ user: req.user._id, text: text.trim() });
  }
  return res.status(201).json({ counter });
}

async function increment(req, res) {
  const counter = await TasbihCounter.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $inc: { count: 1 } },
    { new: true }
  );
  if (!counter) return res.status(404).json({ message: 'العداد غير موجود' });
  return res.json({ counter });
}

async function reset(req, res) {
  const counter = await TasbihCounter.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: { count: 0 } },
    { new: true }
  );
  if (!counter) return res.status(404).json({ message: 'العداد غير موجود' });
  return res.json({ counter });
}

async function remove(req, res) {
  const counter = await TasbihCounter.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!counter) return res.status(404).json({ message: 'العداد غير موجود' });
  return res.json({ ok: true });
}

module.exports = { list, create, increment, reset, remove };
