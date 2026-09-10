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

export default ATHKAR_META;
