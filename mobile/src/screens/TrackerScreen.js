import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, LayoutAnimation, Platform, RefreshControl, StyleSheet, Switch, UIManager, View } from 'react-native';
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
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import { todayISO, formatGregorian, formatWeekday } from '../utils/date';
import { useAuth } from '../context/AuthContext';
import usePrayerTimes from '../hooks/usePrayerTimes';
import useDailyData from '../hooks/useDailyData';
import ATHKAR_META from '../constants/athkarMeta';

// Each prayer gets its own column; its rawatib/witr/qiyam and any athkar
// naturally tied to that time of day stack underneath it, so marking
// everything around one prayer is one tap-target away from the next.
const PRAYER_COLUMNS = [
  {
    key: 'fajr',
    title: 'الفجر',
    cells: [
      { type: 'fard', key: 'fajr', title: 'الفرض', icon: 'moon-outline' },
      { type: 'nawafil', key: 'fajrSunnah', title: 'سنة', icon: 'star-outline' },
      { type: 'athkar', category: 'morning', title: 'الصباح', icon: 'partly-sunny-outline' },
    ],
  },
  {
    key: 'dhuhr',
    title: 'الظهر',
    cells: [
      { type: 'fard', key: 'dhuhr', title: 'الفرض', icon: 'moon-outline' },
      { type: 'nawafil', key: 'dhuhrQabliyah', title: 'قبلية', icon: 'star-outline' },
      { type: 'nawafil', key: 'dhuhrBadiyah', title: 'بعدية', icon: 'star-outline' },
    ],
  },
  {
    key: 'asr',
    title: 'العصر',
    cells: [
      { type: 'fard', key: 'asr', title: 'الفرض', icon: 'moon-outline' },
      { type: 'athkar', category: 'evening', title: 'المساء', icon: 'moon-outline' },
    ],
  },
  {
    key: 'maghrib',
    title: 'المغرب',
    cells: [
      { type: 'fard', key: 'maghrib', title: 'الفرض', icon: 'moon-outline' },
      { type: 'nawafil', key: 'maghribSunnah', title: 'سنة', icon: 'star-outline' },
    ],
  },
  {
    key: 'isha',
    title: 'العشاء',
    cells: [
      { type: 'fard', key: 'isha', title: 'الفرض', icon: 'moon-outline' },
      { type: 'nawafil', key: 'ishaSunnah', title: 'سنة', icon: 'star-outline' },
      { type: 'nawafil', key: 'witr', title: 'الوتر', icon: 'sparkles-outline' },
      { type: 'nawafil', key: 'qiyam', title: 'قيام', icon: 'sparkles-outline' },
      { type: 'athkar', category: 'sleep', title: 'النوم', icon: 'bed-outline' },
    ],
  },
];

// Athkar not already folded into a prayer column above.
const REMAINING_ATHKAR_KEYS = ['afterPrayer', 'wakeup'];

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
  const date = todayISO();
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
    reload,
    togglePrayer,
    toggleExcused,
    toggleAthkarComplete,
    toggleQuran,
    toggleTask,
  } = useDailyData(date);
  const [refreshing, setRefreshing] = useState(false);

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
      <AppText color={colors.inkSoft} size={13.5} style={{ marginTop: 4, marginBottom: spacing.lg }}>
        {formatWeekday(now)}، {formatGregorian(now)}
      </AppText>

      <WeekRingStrip refreshSignal={stats} />

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
        <ProgressRing percentage={stats?.percentage ?? 0} size={72} strokeWidth={8} />
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

      <SectionHeader title="الصلوات والنوافل" />
      <View style={styles.columnsRow}>
        {PRAYER_COLUMNS.map((column) => {
          const prayerTime = schedule.find((s) => s.key === column.key)?.time;
          const locked = !prayerTime || now < prayerTime;

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

      <SectionHeader title="الأذكار" actionLabel="فتح الكل" onAction={() => navigation.navigate('AthkarList')} />
      {REMAINING_ATHKAR_KEYS.map((key) => {
        const meta = ATHKAR_META[key];
        const progress = athkar?.[key];
        const completed = progress?.completed;
        const ratio = progress ? `${progress.completedItems.length}/${progress.totalItems}` : '';
        return (
          <Bounce
            key={key}
            scaleTo={0.97}
            style={[styles.athkarRow, completed && styles.athkarRowDone]}
            onPress={() => navigation.navigate('AthkarCounter', { category: key })}
          >
            <View style={[styles.athkarIcon, { backgroundColor: `${meta.color}${scheme === 'dark' ? '33' : '22'}` }]}>
              <Ionicons name={completed ? 'checkmark' : meta.icon} size={18} color={meta.color} />
            </View>
            <AppText weight="semibold" size={14} style={{ flex: 1 }}>
              {meta.title}
            </AppText>
            <AppText size={12.5} color={colors.inkSoft}>
              {ratio}
            </AppText>
          </Bounce>
        );
      })}

      <SectionHeader title="القرآن الكريم" />
      <CheckRow
        title="قراءة القرآن"
        subtitle="ورد يومي من القرآن الكريم"
        checked={Boolean(quran?.completed)}
        onToggle={onToggleQuran}
        icon="book-outline"
      />

      <SectionHeader title="عبادات يومية" actionLabel="إضافة" onAction={() => navigation.navigate('AddTask', { group: 'dailyDeeds' })} />
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

      <SectionHeader title="أخرى" actionLabel="إضافة" onAction={() => navigation.navigate('AddTask', { group: 'other' })} />
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
    </Screen>
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
    summaryCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.md },
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
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    athkarRowDone: { borderColor: colors.sage, backgroundColor: colors.sageSoft },
    athkarIcon: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
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
