import React, { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
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
import colors from '../theme/colors';
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

export default function TrackerScreen({ navigation }) {
  const { user } = useAuth();
  const date = todayISO();
  const now = new Date();
  const { schedule } = usePrayerTimes();
  const {
    stats,
    prayerLog,
    athkar,
    quran,
    dailyDeedTasks,
    otherTasks,
    taskLogs,
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

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.amber} />}>
      <AppText weight="bold" size={22}>
        متابعة العبادات
      </AppText>
      <AppText color={colors.inkSoft} size={13.5} style={{ marginTop: 4, marginBottom: spacing.lg }}>
        {formatWeekday(now)}، {formatGregorian(now)}
      </AppText>

      <WeekRingStrip />

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
                      onPress={() => togglePrayer(cell.type, cell.key)}
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
                    onPress={() => toggleAthkarComplete(cell.category)}
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
          <TouchableOpacity
            key={key}
            style={[styles.athkarRow, completed && styles.athkarRowDone]}
            onPress={() => navigation.navigate('AthkarCounter', { category: key })}
            activeOpacity={0.8}
          >
            <View style={[styles.athkarIcon, { backgroundColor: `${meta.color}22` }]}>
              <Ionicons name={completed ? 'checkmark' : meta.icon} size={18} color={meta.color} />
            </View>
            <AppText weight="semibold" size={14} style={{ flex: 1 }}>
              {meta.title}
            </AppText>
            <AppText size={12.5} color={colors.inkSoft}>
              {ratio}
            </AppText>
          </TouchableOpacity>
        );
      })}

      <SectionHeader title="القرآن الكريم" />
      <CheckRow
        title="قراءة القرآن"
        subtitle="ورد يومي من القرآن الكريم"
        checked={Boolean(quran?.completed)}
        onToggle={toggleQuran}
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
            onToggle={() => toggleTask(task._id)}
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
            onToggle={() => toggleTask(task._id)}
            icon="sparkles-outline"
          />
        ))
      )}
    </Screen>
  );
}

function BucketLine({ label, bucket }) {
  if (!bucket) return null;
  return (
    <View style={styles.bucketLine}>
      <AppText size={11.5} color={colors.inkSoft}>
        {label} {bucket.done}/{bucket.total}
      </AppText>
      <View style={styles.bucketTrack}>
        <View style={[styles.bucketFill, { width: `${Math.round(bucket.ratio * 100)}%` }]} />
      </View>
    </View>
  );
}

function EmptyHint({ text }) {
  return (
    <View style={styles.emptyHint}>
      <AppText size={13} color={colors.inkSoft}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.md },
  bucketLine: { marginTop: 6 },
  bucketTrack: { height: 5, borderRadius: 3, backgroundColor: colors.backgroundAlt, marginTop: 3, overflow: 'hidden' },
  bucketFill: { height: 5, backgroundColor: colors.amber, borderRadius: 3 },
  excuseRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#F5F0FA',
    borderWidth: 1,
    borderColor: '#DCCBEE',
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
