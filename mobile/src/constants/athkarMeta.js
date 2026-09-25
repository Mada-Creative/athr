import colors from '../theme/colors';
import { AFTER_PRAYER_SLOTS, AFTER_PRAYER_SLOT_LABELS, afterPrayerCategory } from './afterPrayerSlots';

// UI metadata for each athkar category — kept separate from the Arabic
// dhikr text (which lives on the backend / falls back to constants/athkarFallback.js)
// so redesigning icons/colors never touches the religious text.
//
// "afterPrayer" isn't a single entry — it's 5, one per prayer, since each
// prayer tracks its own completion (see afterPrayerSlots.js).
const ATHKAR_META = {
  morning: { title: 'أذكار الصباح', icon: 'partly-sunny-outline', color: colors.amber },
  evening: { title: 'أذكار المساء', icon: 'moon-outline', color: colors.clay },
  sleep: { title: 'أذكار النوم', icon: 'bed-outline', color: '#7C6A9C' },
  wakeup: { title: 'أذكار الاستيقاظ', icon: 'alarm-outline', color: '#4E7FA8' },
};

AFTER_PRAYER_SLOTS.forEach((slot) => {
  ATHKAR_META[afterPrayerCategory(slot)] = {
    title: AFTER_PRAYER_SLOT_LABELS[slot],
    icon: 'business-outline',
    color: colors.sage,
  };
});

// The order every athkar grid (Home, AthkarListScreen) actually shows
// these in — a real day's flow, wakeup to sleep, not ATHKAR_META's own
// insertion order (which is just "the 4 standalone ones, then all 5
// afterPrayer slots tacked on at the end").
export const ATHKAR_ORDER = [
  'wakeup',
  'morning',
  afterPrayerCategory('fajr'),
  afterPrayerCategory('dhuhr'),
  afterPrayerCategory('asr'),
  'evening',
  afterPrayerCategory('maghrib'),
  afterPrayerCategory('isha'),
  'sleep',
];

// Which prayer's arrival unlocks each athkar category — mirrors the column
// each one sits under in TrackerScreen's "الصلوات والنوافل" grid (morning
// under fajr, evening under asr, sleep under isha, each "بعد الصلاة" slot
// under its own prayer). Single source of truth so Home applies the exact
// same "opens once its time starts" gating instead of just Tracker.
// `null` (wakeup) means never time-gated — there's no fixed clock moment
// for "just woke up".
export const ATHKAR_UNLOCK_PRAYER = {
  wakeup: null,
  morning: 'fajr',
  [afterPrayerCategory('fajr')]: 'fajr',
  [afterPrayerCategory('dhuhr')]: 'dhuhr',
  [afterPrayerCategory('asr')]: 'asr',
  evening: 'asr',
  [afterPrayerCategory('maghrib')]: 'maghrib',
  [afterPrayerCategory('isha')]: 'isha',
  sleep: 'isha',
};

export default ATHKAR_META;
