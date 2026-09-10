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

export default ATHKAR_META;
