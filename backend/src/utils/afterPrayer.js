// "أذكار بعد الصلاة" isn't tracked as one category for the whole day — it's
// recited after each of the 5 daily prayers, so it needs 5 independent
// completion states per day, one per prayer. Rather than a new model, each
// prayer gets its own synthetic AthkarLog category (afterPrayer_fajr, ...)
// that all share the same dhikr text (athkarContent.afterPrayer). Kept here
// so the model's enum and the controller's resolution logic can't drift
// apart from what the 5 real prayers actually are.
const AFTER_PRAYER_SLOTS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

const afterPrayerCategory = (slot) => `afterPrayer_${slot}`;

const AFTER_PRAYER_CATEGORIES = AFTER_PRAYER_SLOTS.map(afterPrayerCategory);

const isAfterPrayerCategory = (category) => AFTER_PRAYER_CATEGORIES.includes(category);

module.exports = { AFTER_PRAYER_SLOTS, AFTER_PRAYER_CATEGORIES, afterPrayerCategory, isAfterPrayerCategory };
