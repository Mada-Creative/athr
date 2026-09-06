import React, { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import Card from '../components/Card';
import CheckRow from '../components/CheckRow';
import SectionHeader from '../components/SectionHeader';
import ProgressRing from '../components/ProgressRing';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { todayISO, formatGregorian, formatWeekday } from '../utils/date';
import useDailyData from '../hooks/useDailyData';
import ATHKAR_META from '../constants/athkarMeta';

const FARD = [
  { key: 'fajr', title: 'الفجر', subtitle: 'ركعتان' },
  { key: 'dhuhr', title: 'الظهر', subtitle: 'أربع ركعات' },
  { key: 'asr', title: 'العصر', subtitle: 'أربع ركعات' },
  { key: 'maghrib', title: 'المغرب', subtitle: 'ثلاث ركعات' },
  { key: 'isha', title: 'العشاء', subtitle: 'أربع ركعات' },
];

const NAWAFIL = [
  { key: 'fajrSunnah', title: 'سنة الفجر', subtitle: 'ركعتان قبل صلاة الفجر' },
  { key: 'dhuhrQabliyah', title: 'سنة الظهر القبلية', subtitle: '4 ركعات قبل الظهر' },
  { key: 'dhuhrBadiyah', title: 'سنة الظهر البعدية', subtitle: 'ركعتان بعد الظهر' },
  { key: 'maghribSunnah', title: 'سنة المغرب', subtitle: 'ركعتان بعد المغرب' },
  { key: 'ishaSunnah', title: 'سنة العشاء', subtitle: 'ركعتان بعد العشاء' },
  { key: 'qiyam', title: 'قيام الليل', subtitle: 'من بعد العشاء حتى طلوع الفجر' },
  { key: 'witr', title: 'صلاة الوتر', subtitle: 'ركعة أو ثلاث أو خمس أو أكثر' },
];

export default function TrackerScreen({ navigation }) {
  const date = todayISO();
  const now = new Date();
  const {
    loading,
    stats,
    prayerLog,
    athkar,
    quran,
    dailyDeedTasks,
    otherTasks,
    taskLogs,
    reload,
    togglePrayer,
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

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.amber} />}>
      <AppText weight="bold" size={22}>
        متابعة العبادات
      </AppText>
      <AppText color={colors.inkSoft} size={13.5} style={{ marginTop: 4 }}>
        {formatWeekday(now)}، {formatGregorian(now)}
      </AppText>

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

      <SectionHeader title="الصلوات المفروضة" />
      {FARD.map((item) => (
        <CheckRow
          key={item.key}
          title={item.title}
          subtitle={item.subtitle}
          checked={Boolean(prayerLog?.fard?.[item.key])}
          onToggle={() => togglePrayer('fard', item.key)}
          icon="moon-outline"
        />
      ))}

      <SectionHeader title="النوافل والسنن الرواتب" />
      {NAWAFIL.map((item) => (
        <CheckRow
          key={item.key}
          title={item.title}
          subtitle={item.subtitle}
          checked={Boolean(prayerLog?.nawafil?.[item.key])}
          onToggle={() => togglePrayer('nawafil', item.key)}
          icon="star-outline"
        />
      ))}

      <SectionHeader title="الأذكار" actionLabel="فتح الكل" onAction={() => navigation.navigate('AthkarList')} />
      {Object.keys(ATHKAR_META).map((key) => {
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
  summaryCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  bucketLine: { marginTop: 6 },
  bucketTrack: { height: 5, borderRadius: 3, backgroundColor: colors.backgroundAlt, marginTop: 3, overflow: 'hidden' },
  bucketFill: { height: 5, backgroundColor: colors.amber, borderRadius: 3 },
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
