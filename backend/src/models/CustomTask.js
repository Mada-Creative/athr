const mongoose = require('mongoose');

// User-defined checklist items shown under "عبادات يومية" (dailyDeeds) and
// "أخرى" (other) on the tracker. Seeded with a default "duha prayer" task.
const CustomTaskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    group: { type: String, enum: ['dailyDeeds', 'other'], required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    icon: { type: String, default: 'sparkles' },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CustomTask', CustomTaskSchema);
