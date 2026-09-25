const Mosque = require('../models/Mosque');

function withAdmin(mosque) {
  const obj = mosque.toPublicJSON();
  obj.addedBy = mosque.addedBy;
  obj.createdAt = mosque.createdAt;
  obj.reports = mosque.reports;
  return obj;
}

async function listPending(req, res) {
  const mosques = await Mosque.find({ status: 'pending' }).populate('addedBy', 'name email').sort({ createdAt: 1 });
  return res.json({ mosques: mosques.map(withAdmin) });
}

async function approve(req, res) {
  const mosque = await Mosque.findOneAndUpdate({ _id: req.params.id, status: 'pending' }, { status: 'approved' }, { new: true });
  if (!mosque) return res.status(404).json({ message: 'المسجد غير موجود' });
  return res.json({ mosque: withAdmin(mosque) });
}

async function reject(req, res) {
  const mosque = await Mosque.findOneAndUpdate({ _id: req.params.id, status: 'pending' }, { status: 'rejected' }, { new: true });
  if (!mosque) return res.status(404).json({ message: 'المسجد غير موجود' });
  return res.json({ mosque: withAdmin(mosque) });
}

// Approved mosques that at least one user has reported — a separate queue
// from `listPending`, since these are already live on everyone's map and
// need a decision (dismiss the report vs. pull the pin), not a first look.
async function listReported(req, res) {
  const mosques = await Mosque.find({ status: 'approved', 'reports.0': { $exists: true } })
    .populate('addedBy', 'name email')
    .populate('reports.user', 'name email')
    .sort({ updatedAt: -1 });
  return res.json({ mosques: mosques.map(withAdmin) });
}

// Every approved mosque, reported or not — lets the reviewer pull a pin
// they personally spot an issue with later, not just ones someone else
// already flagged (see removeMosque, reused by both this list and
// listReported).
async function listApprovedAll(req, res) {
  const mosques = await Mosque.find({ status: 'approved' }).populate('addedBy', 'name email').sort({ createdAt: -1 });
  return res.json({ mosques: mosques.map(withAdmin) });
}

async function dismissReports(req, res) {
  const mosque = await Mosque.findOneAndUpdate({ _id: req.params.id }, { $set: { reports: [] } }, { new: true });
  if (!mosque) return res.status(404).json({ message: 'المسجد غير موجود' });
  return res.json({ mosque: withAdmin(mosque) });
}

async function removeMosque(req, res) {
  const mosque = await Mosque.findOneAndUpdate({ _id: req.params.id }, { status: 'rejected' }, { new: true });
  if (!mosque) return res.status(404).json({ message: 'المسجد غير موجود' });
  return res.json({ ok: true });
}

module.exports = { listPending, approve, reject, listReported, listApprovedAll, dismissReports, removeMosque };
