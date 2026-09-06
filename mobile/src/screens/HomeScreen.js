import React, { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import Card from '../components/Card';
import ProgressRing from '../components/ProgressRing';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { useAuth } from '../context/AuthContext';
import { todayISO, formatGregorian, formatWeekday, toHijri, greetingFor } from '../utils/date';
import usePrayerTimes, { formatCountdown, formatClock } from '../hooks/usePrayerTimes';
import useDailyData from '../hooks/useDailyData';

const FARD_ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

const QUICK_LINKS = [
  { key: 'morning', title: 'أذكار الصباح', icon: 'partly-sunny-outline', color: colors.amber, route: 'AthkarCounter', params: { category: 'morning' } },
  { key: 'evening', title: 'أذكار المساء', icon: 'moon-outline', color: colors.clay, route: 'AthkarCounter', params: { category: 'evening' } },
  { key: 'afterPrayer', title: 'أذكار بعد الصلاة', icon: 'business-outline', color: colors.sage, route: 'AthkarCounter', params: { category: 'afterPrayer' } },
  { key: 'sleep', title: 'أذكار النوم', icon: 'bed-outline', color: '#7C6A9C', route: 'AthkarCounter', params: { category: 'sleep' } },
  { key: 'wakeup', title: 'أذكار الاستيقاظ', icon: 'alarm-outline', color: '#4E7FA8', route: 'AthkarCounter', params: { category: 'wakeup' } },
  { key: 'quran', title: 'وِرد القرآن', icon: 'book-outline', color: colors.amberDeep, route: 'Quran' },
  { key: 'names', title: 'أسماء الله الحسنى', icon: 'sparkles-outline', color: colors.sage, route: 'Names' },
  { key: 'duas', title: 'أدعية مأثورة', icon: 'hand-left-outline', color: colors.clay, route: 'Duas' },
  { key: 'qibla', title: 'اتجاه القبلة', icon: 'compass-outline', color: colors.ink, route: 'Qibla' },
  { key: 'weekly', title: 'إحصائياتي', icon: 'stats-chart-outline', color: colors.amber, route: 'WeeklyStats' },
];

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const date = todayISO();
  const now = new Date();
  const hijri = toHijri(now);
  const { schedule, next, remainingMs } = usePrayerTimes({ methodName: user?.calculationMethod });
  const { loading, stats, prayerLog, togglePrayer, reload } = useDailyData(date);
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

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.amber} />}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.iconBtn}>
          <Ionicons name="settings-outline" size={20} color={colors.ink} />
        </TouchableOpacity>
        <AppText weight="bold" size={20}>
          أثر
        </AppText>
        <TouchableOpacity onPress={() => navigation.navigate('Search')} style={styles.iconBtn}>
          <Ionicons name="search-outline" size={20} color={colors.ink} />
        </TouchableOpacity>
      </View>

      <AppText weight="bold" size={22} style={{ marginTop: spacing.lg }}>
        {greetingFor(now)}{user?.name ? `، ${user.name.split(' ')[0]}` : ''}
      </AppText>
      <AppText color={colors.inkSoft} size={13.5} style={{ marginTop: 4 }}>
        {formatWeekday(now)}، {formatGregorian(now)} — {hijri.day} {hijri.month} {hijri.year}هـ
      </AppText>

      <Card style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View>
            <AppText color={colors.amberSoft} size={12.5}>
              الصلاة القادمة
            </AppText>
            <AppText weight="bold" size={22} color={colors.white} style={{ marginTop: 2 }}>
              {next?.label || '—'}
            </AppText>
          </View>
          <View style={styles.countdownBadge}>
            <Ionicons name="time-outline" size={14} color={colors.ink} />
            <AppText weight="semibold" size={15} style={{ marginRight: 4 }}>
              {formatCountdown(remainingMs)}
            </AppText>
          </View>
        </View>

        <View style={styles.prayerRow}>
          {FARD_ORDER.map((key) => {
            const info = schedule.find((s) => s.key === key);
            const done = Boolean(prayerLog?.fard?.[key]);
            return (
              <TouchableOpacity
                key={key}
                style={[styles.prayerChip, done && styles.prayerChipDone]}
                onPress={() => togglePrayer('fard', key)}
              >
                {done ? <Ionicons name="checkmark-circle" size={16} color={colors.sage} /> : null}
                <AppText size={12.5} weight="semibold" color={done ? colors.sage : colors.amberSoft}>
                  {info?.label || key}
                </AppText>
                <AppText size={11} color={done ? colors.sage : colors.amberSoft}>
                  {info ? formatClock(info.time) : '--:--'}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Tracker')}>
        <Card style={styles.scoreCard}>
          <ProgressRing percentage={stats?.percentage ?? 0} size={78} strokeWidth={9} />
          <View style={{ flex: 1, marginRight: spacing.md }}>
            <AppText weight="bold" size={16}>
              بصمتك اليوم
            </AppText>
            <AppText size={12.5} color={colors.inkSoft} style={{ marginTop: 2 }}>
              نسبة إنجازك من الصلوات، الأذكار، القرآن والنوافل
            </AppText>
          </View>
          <Ionicons name="chevron-back" size={20} color={colors.inkSoft} />
        </Card>
      </TouchableOpacity>

      <AppText weight="bold" size={18} style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
        الأقسام
      </AppText>

      <View style={styles.grid}>
        {QUICK_LINKS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.gridItem}
            activeOpacity={0.8}
            onPress={() => navigation.navigate(item.route, item.params)}
          >
            <View style={[styles.gridIcon, { backgroundColor: `${item.color}22` }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <AppText weight="semibold" size={13} style={{ marginTop: spacing.sm, textAlign: 'center' }}>
              {item.title}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
    marginTop: spacing.xl,
  },
  heroTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' },
  countdownBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  prayerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  prayerChip: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    flex: 1,
  },
  prayerChipDone: { backgroundColor: 'rgba(95,132,103,0.18)' },
  scoreCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  gridIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
