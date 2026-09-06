import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import Card from '../components/Card';
import ProgressRing from '../components/ProgressRing';
import LiveClock from '../components/LiveClock';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import { useAuth } from '../context/AuthContext';
import { todayISO, formatGregorian, formatWeekday, toHijri, greetingFor } from '../utils/date';
import usePrayerTimes, { formatCountdown, formatClock } from '../hooks/usePrayerTimes';
import usePrayerNotifications from '../hooks/usePrayerNotifications';
import useDailyData from '../hooks/useDailyData';
import duas from '../constants/duas';

const FARD_ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

// Prayer times, Qibla, the tasbih counter and stats are grouped together
// right under the hero card — the things you'd reach for right after
// checking prayer times — instead of buried in the section grid below.
const PRAYER_MENU = [
  { key: 'times', title: 'مواقيت الصلاة', icon: 'time-outline', route: 'PrayerDetail' },
  { key: 'qibla', title: 'القبلة', icon: 'compass-outline', route: 'Qibla' },
  { key: 'tasbih', title: 'العدّاد', icon: 'sync-outline', route: 'Tasbih' },
  { key: 'stats', title: 'إحصائياتي', icon: 'stats-chart-outline', route: 'WeeklyStats' },
];

export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { user } = useAuth();
  const date = todayISO();
  const now = new Date();
  const hijri = toHijri(now);
  const { schedule, next, remainingMs } = usePrayerTimes();
  const { stats, prayerLog, reload } = useDailyData(date);
  const [refreshing, setRefreshing] = useState(false);

  // amberDeep differs between light/dark, so these live inside the
  // component (recomputed per theme) rather than as a module constant.
  const ATHKAR_LINKS = useMemo(
    () => [
      { key: 'morning', title: 'أذكار الصباح', subtitle: 'حصنك اليوم', icon: 'partly-sunny-outline', color: colors.amber, params: { category: 'morning' } },
      { key: 'evening', title: 'أذكار المساء', subtitle: 'قبل غروب الشمس', icon: 'moon-outline', color: colors.clay, params: { category: 'evening' } },
      { key: 'afterPrayer', title: 'أذكار بعد الصلاة', subtitle: 'بعد كل صلاة مفروضة', icon: 'business-outline', color: colors.sage, params: { category: 'afterPrayer' } },
      { key: 'sleep', title: 'أذكار النوم', subtitle: 'قبل أن تنام', icon: 'bed-outline', color: '#7C6A9C', params: { category: 'sleep' } },
      { key: 'wakeup', title: 'أذكار الاستيقاظ', subtitle: 'أول ما تفتح عينيك', icon: 'alarm-outline', color: '#4E7FA8', params: { category: 'wakeup' } },
    ],
    [colors]
  );

  const MORE_LINKS = useMemo(
    () => [
      { key: 'quran', title: 'وِرد القرآن', subtitle: 'ورد يومي من القرآن الكريم', icon: 'book-outline', color: colors.amberDeep, route: 'Quran' },
      { key: 'names', title: 'أسماء الله الحسنى', subtitle: 'الأسماء التسعة والتسعون', icon: 'sparkles-outline', color: colors.sage, route: 'Names' },
      { key: 'duas', title: 'أدعية مأثورة', subtitle: 'من القرآن والسنة', icon: 'hand-left-outline', color: colors.clay, route: 'Duas' },
    ],
    [colors]
  );

  // Rotates through the curated duas roughly once an hour — a light touch
  // of "there's something new here" without any dedicated timer.
  const hourBucket = Math.floor(now.getTime() / (1000 * 60 * 60));
  const dua = duas[hourBucket % duas.length];

  usePrayerNotifications(schedule, user?.prayerNotifications);

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
        <LiveClock size={17} />
        <View style={styles.topBarIcons}>
          <TouchableOpacity onPress={() => navigation.navigate('Search')} style={styles.iconBtn}>
            <Ionicons name="search-outline" size={19} color={colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.iconBtn}>
            <Ionicons name="settings-outline" size={19} color={colors.ink} />
          </TouchableOpacity>
        </View>
      </View>

      <AppText weight="bold" size={22} style={{ marginTop: spacing.lg }}>
        {greetingFor(now)}{user?.name ? `، ${user.name.split(' ')[0]}` : ''}
      </AppText>
      <AppText color={colors.inkSoft} size={13.5} style={{ marginTop: 4 }}>
        {formatWeekday(now)}، {formatGregorian(now)} — {hijri.day} {hijri.month} {hijri.year}هـ
      </AppText>

      <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Duas')} style={styles.duaStrip}>
        <Ionicons name="hand-left-outline" size={14} color={colors.amberDeep} />
        <AppText size={12.5} weight="semibold" color={colors.amberDeep} style={{ flex: 1 }} numberOfLines={1}>
          {dua.text}
        </AppText>
      </TouchableOpacity>

      <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('PrayerDetail')}>
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
              <Ionicons name="time-outline" size={14} color={colors.accentDark} />
              <AppText weight="semibold" size={15} color={colors.accentDark} style={{ marginRight: 4 }}>
                {formatCountdown(remainingMs)}
              </AppText>
            </View>
          </View>

          <View style={styles.prayerRow}>
            {FARD_ORDER.map((key) => {
              const info = schedule.find((s) => s.key === key);
              const done = Boolean(prayerLog?.fard?.[key]);
              return (
                <View key={key} style={[styles.prayerChip, done && styles.prayerChipDone]}>
                  {done ? <Ionicons name="checkmark-circle" size={16} color={colors.sage} /> : null}
                  <AppText size={12.5} weight="semibold" color={done ? colors.sage : colors.amberSoft}>
                    {info?.label || key}
                  </AppText>
                  <AppText size={11} color={done ? colors.sage : colors.amberSoft}>
                    {info ? formatClock(info.time) : '--:--'}
                  </AppText>
                </View>
              );
            })}
          </View>

          <AppText size={11} color={colors.amberSoft} style={{ marginTop: spacing.md, textAlign: 'center' }}>
            علّم صلاتك من تبويب المتابعة — اضغط هنا للتفاصيل
          </AppText>
        </Card>
      </TouchableOpacity>

      <View style={styles.prayerMenuRow}>
        {PRAYER_MENU.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.prayerMenuItem}
            activeOpacity={0.8}
            onPress={() => navigation.navigate(item.route)}
          >
            <Ionicons name={item.icon} size={20} color={colors.ink} />
            <AppText weight="semibold" size={11.5} style={{ marginTop: 6, textAlign: 'center' }}>
              {item.title}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

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

      <AppText weight="bold" size={16} style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
        الأذكار
      </AppText>
      {ATHKAR_LINKS.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={styles.linkRow}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('AthkarCounter', item.params)}
        >
          <View style={[styles.linkIcon, { backgroundColor: `${item.color}22` }]}>
            <Ionicons name={item.icon} size={19} color={item.color} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText weight="semibold" size={14}>
              {item.title}
            </AppText>
            <AppText size={11.5} color={colors.inkSoft} style={{ marginTop: 1 }}>
              {item.subtitle}
            </AppText>
          </View>
          <Ionicons name="chevron-back" size={16} color={colors.inkSoft} />
        </TouchableOpacity>
      ))}

      <AppText weight="bold" size={16} style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
        أخرى
      </AppText>
      {MORE_LINKS.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={styles.linkRow}
          activeOpacity={0.8}
          onPress={() => navigation.navigate(item.route)}
        >
          <View style={[styles.linkIcon, { backgroundColor: `${item.color}22` }]}>
            <Ionicons name={item.icon} size={19} color={item.color} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText weight="semibold" size={14}>
              {item.title}
            </AppText>
            <AppText size={11.5} color={colors.inkSoft} style={{ marginTop: 1 }}>
              {item.subtitle}
            </AppText>
          </View>
          <Ionicons name="chevron-back" size={16} color={colors.inkSoft} />
        </TouchableOpacity>
      ))}
    </Screen>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    topBar: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    topBarIcons: { flexDirection: 'row-reverse', gap: spacing.sm },
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
    duaStrip: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.amberSoft,
      borderRadius: radius.pill,
      paddingVertical: spacing.xs + 2,
      paddingHorizontal: spacing.md,
      marginTop: spacing.md,
    },
    heroCard: {
      // Fixed dark ink surface — deliberately doesn't invert with the theme.
      backgroundColor: colors.accentDark,
      borderColor: colors.accentDark,
      marginTop: spacing.lg,
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
    prayerMenuRow: {
      flexDirection: 'row-reverse',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    prayerMenuItem: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
    },
    scoreCard: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    linkRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    linkIcon: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  });
}
