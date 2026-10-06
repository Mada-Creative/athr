const mongoose = require('mongoose');

// Daily "wird" (Quran reading portion) checkbox.
const QuranLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, index: true },
    completed: { type: Boolean, default: false },
    pagesRead: { type: Number, default: 0 },
    // Separate from the daily wird (`completed`) — سنة قراءة سورة الكهف
    // only applies on Fridays, so it's its own flag rather than folded
    // into the same checkbox someone might have already ticked for an
    // unrelated reading portion that same day.
    kahfRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

QuranLogSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('QuranLog', QuranLogSchema);
