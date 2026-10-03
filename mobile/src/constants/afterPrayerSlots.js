// "أذكار بعد الصلاة" isn't one daily checkbox — it's recited after each of
// the 5 daily prayers, so it needs its own independent completion state per
// prayer (mirrors backend/src/utils/afterPrayer.js). All 5 slots share the
// exact same dhikr text (constants/athkarContent.js's `afterPrayer` entry);
// only completion is tracked separately, per prayer.
export const AFTER_PRAYER_SLOTS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const AFTER_PRAYER_SLOT_LABELS = {
  fajr: 'بعد الفجر',
  dhuhr: 'بعد الظهر',
  asr: 'بعد العصر',
  maghrib: 'بعد المغرب',
  isha: 'بعد العشاء',
};

export const afterPrayerCategory = (slot) => `afterPrayer_${slot}`;
