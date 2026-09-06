import colors from '../theme/colors';

// UI metadata for each athkar category — kept separate from the Arabic
// dhikr text (which lives on the backend / falls back to constants/athkarFallback.js)
// so redesigning icons/colors never touches the religious text.
const ATHKAR_META = {
  morning: { title: 'أذكار الصباح', icon: 'partly-sunny-outline', color: colors.amber },
  evening: { title: 'أذكار المساء', icon: 'moon-outline', color: colors.clay },
  afterPrayer: { title: 'أذكار بعد الصلاة', icon: 'business-outline', color: colors.sage },
  sleep: { title: 'أذكار النوم', icon: 'bed-outline', color: '#7C6A9C' },
  wakeup: { title: 'أذكار الاستيقاظ', icon: 'alarm-outline', color: '#4E7FA8' },
};

export default ATHKAR_META;
