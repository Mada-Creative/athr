const mongoose = require('mongoose');

// One document per user per day: the 5 obligatory prayers plus the rawatib /
// qiyam / witr group shown together as "النوافل" on the tracker screen.
const PrayerLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD (local)

    fard: {
      fajr: { type: Boolean, default: false },
      dhuhr: { type: Boolean, default: false },
      asr: { type: Boolean, default: false },
      maghrib: { type: Boolean, default: false },
      isha: { type: Boolean, default: false },
    },

    nawafil: {
      fajrSunnah: { type: Boolean, default: false },
      dhuhrQabliyah: { type: Boolean, default: false },
      dhuhrBadiyah: { type: Boolean, default: false },
      maghribSunnah: { type: Boolean, default: false },
      ishaSunnah: { type: Boolean, default: false },
      qiyam: { type: Boolean, default: false },
      witr: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

PrayerLogSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('PrayerLog', PrayerLogSchema);
