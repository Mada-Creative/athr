const mongoose = require('mongoose');
const { AFTER_PRAYER_CATEGORIES } = require('../utils/afterPrayer');

// Tracks progress for one athkar category (morning, evening, ...) on one
// day. "afterPrayer" has no single entry of its own here — it's 5 separate
// categories (afterPrayer_fajr, afterPrayer_dhuhr, ...), one per prayer, so
// each prayer resets independently instead of sharing one daily checkbox.
const AthkarLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    category: {
      type: String,
      required: true,
      enum: ['morning', 'evening', 'sleep', 'wakeup', 'custom', ...AFTER_PRAYER_CATEGORIES],
    },
    completedItems: { type: [Number], default: [] }, // indices of finished dhikr items
    totalItems: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AthkarLogSchema.index({ user: 1, date: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('AthkarLog', AthkarLogSchema);
