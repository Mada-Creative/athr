import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  Platform,
  RefreshControl,
  StyleSheet,
  Switch,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import Card from '../components/Card';
import CheckRow from '../components/CheckRow';
import SectionHeader from '../components/SectionHeader';
import ProgressRing from '../components/ProgressRing';
import PrayerCell from '../components/PrayerCell';
import WeekRingStrip from '../components/WeekRingStrip';
import Bounce from '../components/Bounce';
import PopIcon from '../components/PopIcon';
import AnimatedPercent from '../components/AnimatedPercent';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import { todayISO, addDays, formatGregorian, formatWeekday } from '../utils/date';
import { useAuth } from '../context/AuthContext';
import usePrayerTimes from '../hooks/usePrayerTimes';
import useDailyData from '../hooks/useDailyData';
import useDoneAnim from '../hooks/useDoneAnim';
import ATHKAR_META from '../constants/athkarMeta';
import { afterPrayerCategory } from '../constants/afterPrayerSlots';

// Each prayer gets its own column; its rawatib/witr/qiyam and any athkar
// naturally tied to that time of day stack underneath it, so marking
// everything around one prayer is one tap-target away from the next.
//
// Every column also gets its own "بعد الصلاة" athkar cell (right after the
// fard) — that dhikr is meant to be read after *each* prayer, not once for
// the whole day, so its completion is tracked per prayer via its own
// afterPrayer_<slot> category (see constants/afterPrayerSlots.js).
const PRAYER_COLUMNS = [
  {
    key: 'fajr',
    title: 'الفجر',
    cells: [
      { type: 'fard', key: 'fajr', title: 'الفرض', icon: 'moon-outline' },
      { type: 'athkar', category: afterPrayerCategory('fajr'), title: 'بعد الصلاة', icon: 'business-outline' },
      { type: 'nawafil', key: 'fajrSunnah', title: 'سنة', icon: 'star-outline' },
      { type: 'athkar', category: 'morning', title: 'الصباح', icon: 'partly-sunny-outline' },
    ],
  },
  {
    key: 'dhuhr',
    title: 'الظهر',
    cells: [
      { type: 'fard', key: 'dhuhr', title: 'الفرض', icon: 'moon-outline' },
      { type: 'athkar', category: afterPrayerCategory('dhuhr'), title: 'بعد الصلاة', icon: 'business-outline' },
      { type: 'nawafil', key: 'dhuhrQabliyah', title: 'قبلية', icon: 'star-outline' },
      { type: 'nawafil', key: 'dhuhrBadiyah', title: 'بعدية', icon: 'star-outline' },
    ],
  },
  {
    key: 'asr',
    title: 'العصر',
    cells: [
      { type: 'fard', key: 'asr', title: 'الفرض', icon: 'moon-outline' },
      { type: 'athkar', category: afterPrayerCategory('asr'), title: 'بعد الصلاة', icon: 'business-outline' },
      { type: 'athkar', category: 'evening', title: 'المساء', icon: 'moon-outline' },
    ],
  },
  {
    key: 'maghrib',
    title: 'المغرب',
    cells: [
      { type: 'fard', key: 'maghrib', title: 'الفرض', icon: 'moon-outline' },
      { type: 'athkar', category: afterPrayerCategory('maghrib'), title: 'بعد الصلاة', icon: 'business-outline' },
      { type: 'nawafil', key: 'maghribSunnah', title: 'سنة', icon: 'star-outline' },
    ],
  },
  {
    key: 'isha',
    title: 'العشاء',
    cells: [
      { type: 'fard', key: 'isha', title: 'الفرض', icon: 'moon-outline' },
      { type: 'athkar', category: afterPrayerCategory('isha'), title: 'بعد الصلاة', icon: 'business-outline' },
      { type: 'nawafil', key: 'ishaSunnah', title: 'سنة', icon: 'star-outline' },
      { type: 'nawafil', key: 'witr', title: 'الوتر', icon: 'sparkles-outline' },
      { type: 'nawafil', key: 'qiyam', title: 'قيام', icon: 'sparkles-outline' },
      { type: 'athkar', category: 'sleep', title: 'النوم', icon: 'bed-outline' },
    ],
  },
];

// Athkar not already folded into a prayer column above.
const REMAINING_ATHKAR_KEYS = ['wakeup'];

// Old-architecture Android needs this opt-in for LayoutAnimation; harmless
// to call unconditionally elsewhere.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Smooths every checked/unchecked-driven layout & color change on this
// screen (prayer cells, nawafil, athkar rows, check rows) instead of them
// snapping instantly — call right before the state update that causes it.
function animateNext() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

export default function TrackerScreen({ navigation }) {
  const { colors, scheme } = useTheme();
  const styles = createStyles(colors);
  const { user } = useAuth();
  // Which day this screen is showing — defaults to today, but every toggle
  // and stat here is already keyed off `date` end to end (useDailyData,
  // the backend routes), so stepping this back is the whole "view a
  // previous day" feature: nothing downstream needs to know it moved.
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const date = selectedDate;
  const isToday = date === todayISO();
  const displayDate = new Date(`${date}T00:00:00`);
  // Ticks so a prayer cell unlocks itself the moment its time starts,
  // instead of staying locked-looking until something else re-renders the
  // screen (a pull-to-refresh, navigating away and back, ...).
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(id);
  }, []);
  const { schedule } = usePrayerTimes();
  const {
    stats,
    prayerLog,
    athkar,
    quran,
    dailyDeedTasks,
    otherTasks,
    taskLogs,
    error,
    syncNotice,
    isOffline,
    loading,
    reload,
    togglePrayer,
    toggleExcused,
    toggleAthkarComplete,
    toggleQuran,
    toggleTask,
  } = useDailyData(date);
  const [refreshing, setRefreshing] = useState(false);
  const [showWeights, setShowWeights] = useState(false);
  // Same reasoning as Home's score ring: only true for a genuine first
  // load with nothing cached yet — a normal refetch on focus never shows
  // this over data that's already on screen.
  const showingFirstLoad = loading && !stats;

  // "x/y" next to a section's own title — a section header shows its own
  // completion at a glance instead of only the items underneath it.
  const bucketCount = (bucket) => (bucket ? `${bucket.done}/${bucket.total}` : null);
  const prayersCount = stats
    ? `${stats.buckets.prayers.done + stats.buckets.nawafil.done}/${stats.buckets.prayers.total + stats.buckets.nawafil.total}`
    : null;

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const isTaskDone = (taskId) => taskLogs.find((l) => l.task === taskId)?.completed || false;
  const excused = Boolean(prayerLog?.excused);

  const onTogglePrayer = (type, key) => {
    animateNext();
    togglePrayer(type, key);
  };
  const onToggleAthkar = (category) => {
    animateNext();
    toggleAthkarComplete(category);
  };
  const onToggleQuran = () => {
    animateNext();
    toggleQuran();
  };
  const onToggleTask = (taskId) => {
    animateNext();
    toggleTask(taskId);
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.amber} />}>
      <AppText weight="bold" size={22}>
        متابعة العبادات
      </AppText>

      <View style={styles.dateNavRow}>
        <TouchableOpacity onPress={() => setSelectedDate((d) => addDays(d, -1))} style={styles.dateNavBtn}>
          <Ionicons name="chevron-forward" size={18} color={colors.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <AppText weight="semibold" size={14}>
            {isToday ? 'اليوم' : formatWeekday(displayDate)}
          </AppText>
          <AppText size={11.5} color={colors.inkSoft} style={{ marginTop: 1 }}>
            {formatGregorian(displayDate)}
          </AppText>
        </View>
        <TouchableOpacity
          onPress={() => setSelectedDate((d) => addDays(d, 1))}
          disabled={isToday}
          style={[styles.dateNavBtn, isToday && styles.dateNavBtnDisabled]}
        >
          <Ionicons name="chevron-back" size={18} color={colors.ink} />
        </TouchableOpacity>
      </View>
      {!isToday ? (
        <TouchableOpacity onPress={() => setSelectedDate(todayISO())} style={styles.backToTodayBtn}>
          <Ionicons name="refresh-outline" size={13} color={colors.amberDeep} />
          <AppText size={12} weight="semibold" color={colors.amberDeep} style={{ marginRight: 4 }}>
            الرجوع لليوم
          </AppText>
        </TouchableOpacity>
      ) : null}

      <WeekRingStrip refreshSignal={stats} selectedDate={date} onSelectDate={setSelectedDate} />

      {error ? (
        <View style={styles.errorBanner}>
          <AppText size={12.5} color={colors.clay}>
            {error}
          </AppText>
        </View>
      ) : null}

      {!error && (isOffline || syncNotice) ? (
        <View style={styles.noticeBanner}>
          <AppText size={12} color={colors.inkSoft}>
            {syncNotice || 'غير متصل — تعرض بيانات محفوظة على جهازك'}
          </AppText>
        </View>
      ) : null}

      <Card style={styles.summaryCard}>
        {showingFirstLoad ? (
          <View style={styles.summaryRingLoading}>
            <ActivityIndicator color={colors.amber} />
          </View>
        ) : (
          <ProgressRing percentage={stats?.percentage ?? 0} size={72} strokeWidth={8} />
        )}
        <View style={{ flex: 1, marginRight: spacing.md }}>
          <AppText weight="bold" size={15}>
            إنجاز اليوم
          </AppText>
          {stats ? (
            <View style={{ marginTop: spacing.xs }}>
              <BucketLine label="الصلوات" bucket={stats.buckets.prayers} />
              <BucketLine label="النوافل" bucket={stats.buckets.nawafil} />
              <BucketLine label="الأذكار" bucket={stats.buckets.athkar} />
            </View>
          ) : null}
        </View>
      </Card>

      {user?.gender === 'female' ? (
        <View style={styles.excuseRow}>
          <Switch value={excused} onValueChange={toggleExcused} trackColor={{ true: '#7C5FA6' }} />
          <View style={{ flex: 1 }}>
            <AppText size={13.5} weight="semibold">
              يوم عذر شرعي
            </AppText>
            <AppText size={11.5} color={colors.inkSoft} style={{ marginTop: 2 }}>
              الصلاة غير واجبة عليكِ اليوم، ولن يُحتسب هذا اليوم غيابًا في إنجازك
            </AppText>
          </View>
        </View>
      ) : null}

      <SectionHeader title="الصلوات والنوافل" count={prayersCount} />
      <View style={styles.columnsRow}>
        {PRAYER_COLUMNS.map((column) => {
          const prayerTime = schedule.find((s) => s.key === column.key)?.time;
          // Locking (a cell only opens once its prayer's time starts) is a
          // same-day concept — `schedule` is always *today's* times, so on
          // a past day everything is simply open for backfilling.
          const locked = isToday && (!prayerTime || now < prayerTime);

          return (
            <View key={column.key} style={styles.column}>
              <AppText weight="bold" size={12} style={{ marginBottom: spacing.xs, textAlign: 'center' }}>
                {column.title}
              </AppText>
              {column.cells.map((cell) => {
                if (cell.type === 'fard' || cell.type === 'nawafil') {
                  const done = Boolean(prayerLog?.[cell.type]?.[cell.key]);
                  return (
                    <PrayerCell
                      key={cell.key}
                      title={cell.title}
                      icon={cell.icon}
                      done={done}
                      locked={!excused && locked}
                      excused={excused}
                      onPress={() => onTogglePrayer(cell.type, cell.key)}
                    />
                  );
                }
                // athkar cell — one tap marks the whole category done; a
                // long-press still opens the counter for those who want to
                // actually read/count through it.
                const progress = athkar?.[cell.category];
                return (
                  <PrayerCell
                    key={cell.category}
                    title={cell.title}
                    icon={cell.icon}
                    done={Boolean(progress?.completed)}
                    locked={locked}
                    onPress={() => onToggleAthkar(cell.category)}
                    onLongPress={() => navigation.navigate('AthkarCounter', { category: cell.category })}
                  />
                );
              })}
            </View>
          );
        })}
      </View>
      <AppText size={11} color={colors.inkSoft} style={{ marginTop: spacing.xs, marginBottom: spacing.lg }}>
        كل مربع يُفتح بعد دخول وقت صلاته — اضغط مطوّلًا على مربع الأذكار لفتح العدّاد
      </AppText>

      <SectionHeader
        title="الأذكار"
        count={bucketCount(stats?.buckets.athkar)}
        actionLabel="فتح الكل"
        onAction={() => navigation.navigate('AthkarList')}
      />
      {REMAINING_ATHKAR_KEYS.map((key) => {
        const meta = ATHKAR_META[key];
        const progress = athkar?.[key];
        const completed = Boolean(progress?.completed);
        const pct = progress?.totalItems ? Math.round((progress.completedItems.length / progress.totalItems) * 100) : 0;
        return (
          <AthkarSummaryRow
            key={key}
            meta={meta}
            completed={completed}
            pct={pct}
            onPress={() => onToggleAthkar(key)}
            onLongPress={() => navigation.navigate('AthkarCounter', { category: key })}
          />
        );
      })}
      <AppText size={11} color={colors.inkSoft} style={{ marginTop: spacing.xs, marginBottom: spacing.lg }}>
        اضغط لتعليم الذكر مكتملًا — اضغط مطوّلًا لفتح العدّاد والعدّ فيه دِكرًا دِكرًا
      </AppText>

      <SectionHeader title="القرآن الكريم" />
      <CheckRow
        title="قراءة القرآن"
        subtitle="ورد يومي من القرآن الكريم"
        checked={Boolean(quran?.completed)}
        onToggle={onToggleQuran}
        icon="book-outline"
      />

      <SectionHeader
        title="عبادات يومية"
        count={dailyDeedTasks.length ? bucketCount(stats?.buckets.dailyDeeds) : null}
        actionLabel="إضافة"
        onAction={() => navigation.navigate('AddTask', { group: 'dailyDeeds' })}
      />
      {dailyDeedTasks.length === 0 ? (
        <EmptyHint text="لا توجد عبادات مضافة بعد" />
      ) : (
        dailyDeedTasks.map((task) => (
          <CheckRow
            key={task._id}
            title={task.title}
            subtitle={task.description}
            checked={isTaskDone(task._id)}
            onToggle={() => onToggleTask(task._id)}
            icon="sunny-outline"
          />
        ))
      )}

      <SectionHeader
        title="أخرى"
        count={otherTasks.length ? bucketCount(stats?.buckets.other) : null}
        actionLabel="إضافة"
        onAction={() => navigation.navigate('AddTask', { group: 'other' })}
      />
      {otherTasks.length === 0 ? (
        <EmptyHint text="أضف عبادات أو أعمالًا خاصة بك لتتبعها" />
      ) : (
        otherTasks.map((task) => (
          <CheckRow
            key={task._id}
            title={task.title}
            subtitle={task.description}
            checked={isTaskDone(task._id)}
            onToggle={() => onToggleTask(task._id)}
            icon="sparkles-outline"
          />
        ))
      )}

      {stats ? (
        <>
          <TouchableOpacity onPress={() => setShowWeights((s) => !s)} style={styles.weightsToggle}>
            <Ionicons name={showWeights ? 'chevron-up' : 'chevron-down'} size={13} color={colors.amberDeep} />
            <AppText size={12.5} weight="semibold" color={colors.amberDeep} style={{ marginRight: 4 }}>
              كيف يُحسب الإنجاز؟
            </AppText>
          </TouchableOpacity>
          {showWeights ? (
            <View style={styles.weightsCard}>
              <WeightPill label="الصلوات" value={stats.buckets.prayers.weight} />
              <WeightPill label="النوافل" value={stats.buckets.nawafil.weight} />
              <WeightPill label="الأذكار" value={stats.buckets.athkar.weight} />
              <WeightPill label="القرآن" value={stats.buckets.quran.weight} />
              <WeightPill label="عبادات يومية" value={stats.buckets.dailyDeeds.weight} />
              <WeightPill label="أخرى" value={stats.buckets.other.weight} />
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function WeightPill({ label, value }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.weightPill}>
      <AppText size={11.5} weight="bold" color={colors.amberDeep}>
        {value}%
      </AppText>
      <AppText size={11.5} color={colors.inkSoft} style={{ marginRight: 4 }}>
        {label}
      </AppText>
    </View>
  );
}

// One row in the "أذكار بعد الصلاة / الاستيقاظ" list — its own component so
// its color-fade animation can use a hook per row without breaking the
// rules of hooks inside the .map() above.
// The color fade lives on its own inner Animated.View rather than on
// Bounce's own `style` prop: Bounce already animates its press-scale with
// useNativeDriver: true, and React Native can't mix a native-driven value
// with a JS-driven one (this color fade — colors aren't native-driver
// eligible) on the same animated node without crashing at runtime.
function AthkarSummaryRow({ meta, completed, pct, onPress, onLongPress }) {
  const { colors, scheme } = useTheme();
  const styles = createStyles(colors);
  const doneAnim = useDoneAnim(completed);
  const rowBg = doneAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.surface, colors.sageSoft] });
  const rowBorder = doneAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.border, colors.sage] });
  const badgeBg = doneAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.surface, colors.sage] });
  const badgeBorder = doneAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.border, colors.sage] });

  return (
    <Bounce scaleTo={0.97} onPress={onPress} onLongPress={onLongPress}>
      <Animated.View style={[styles.athkarRow, { backgroundColor: rowBg, borderColor: rowBorder }]}>
        <View style={[styles.athkarIcon, { backgroundColor: `${meta.color}${scheme === 'dark' ? '33' : '22'}` }]}>
          <PopIcon name={completed ? 'checkmark' : meta.icon} size={18} color={meta.color} />
        </View>
        <AppText weight="semibold" size={14} style={{ flex: 1 }}>
          {meta.title}
        </AppText>
        <Animated.View style={[styles.pctBadge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
          <AnimatedPercent value={pct} color={completed ? colors.white : colors.inkSoft} />
        </Animated.View>
      </Animated.View>
    </Bounce>
  );
}

function BucketLine({ label, bucket }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const percent = bucket ? Math.round(bucket.ratio * 100) : 0;
  const width = useRef(new Animated.Value(percent)).current;

  useEffect(() => {
    Animated.timing(width, {
      toValue: percent,
      duration: 600,
      useNativeDriver: false, // width isn't supported by the native driver
    }).start();
  }, [percent, width]);

  if (!bucket) return null;
  return (
    <View style={styles.bucketLine}>
      <AppText size={11.5} color={colors.inkSoft}>
        {label} {bucket.done}/{bucket.total}
      </AppText>
      <View style={styles.bucketTrack}>
        <Animated.View
          style={[styles.bucketFill, { width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]}
        />
      </View>
    </View>
  );
}

function EmptyHint({ text }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.emptyHint}>
      <AppText size={13} color={colors.inkSoft}>
        {text}
      </AppText>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    errorBanner: {
      backgroundColor: colors.claySoft,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.clay,
      padding: spacing.sm,
      marginBottom: spacing.md,
    },
    noticeBanner: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.sm,
      marginBottom: spacing.md,
    },
    dateNavRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.md,
      marginBottom: 50,
    },
    dateNavBtn: {
      width: 34,
      height: 34,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateNavBtnDisabled: { opacity: 0.35 },
    backToTodayBtn: {
      flexDirection: 'row-reverse',
      alignSelf: 'center',
      alignItems: 'center',
      marginTop: spacing.xs,
      marginBottom: 30,
    },
    // minHeight guarantees the row is never computed shorter than the
    // ring itself (size=72 below).
    summaryCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.md, minHeight: 72 },
    // Same footprint as the ring it stands in for, so the card never
    // reflows once real data (or a cached snapshot) replaces it.
    summaryRingLoading: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
    bucketLine: { marginTop: 6 },
    bucketTrack: { height: 5, borderRadius: 3, backgroundColor: colors.backgroundAlt, marginTop: 3, overflow: 'hidden' },
    bucketFill: { height: 5, backgroundColor: colors.amber, borderRadius: 3 },
    excuseRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.md,
    },
    columnsRow: { flexDirection: 'row-reverse', gap: spacing.sm, alignItems: 'flex-start' },
    column: { flex: 1 },
    athkarRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    athkarIcon: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
    // Colors are animated (useDoneAnim in AthkarSummaryRow) rather than
    // static here, so a plain done/not-done variant isn't needed.
    pctBadge: {
      width: 38,
      height: 38,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    weightsToggle: {
      flexDirection: 'row-reverse',
      alignSelf: 'center',
      alignItems: 'center',
      marginTop: spacing.xl,
      paddingVertical: spacing.sm,
    },
    weightsCard: {
      flexDirection: 'row-reverse',
      flexWrap: 'wrap',
      gap: spacing.sm,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
    },
    weightPill: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
    },
    emptyHint: {
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      borderRadius: radius.md,
      padding: spacing.lg,
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
  });
}
