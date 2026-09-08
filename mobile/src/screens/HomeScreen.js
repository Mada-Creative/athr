import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import Card from '../components/Card';
import ProgressRing from '../components/ProgressRing';
import LiveClock from '../components/LiveClock';
import SectionHeader from '../components/SectionHeader';
import Bounce from '../components/Bounce';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import { useAuth } from '../context/AuthContext';
import { todayISO, formatGregorian, formatWeekday, toHijri, greetingFor } from '../utils/date';
import usePrayerTimes, { formatCountdownWithSeconds, formatClock } from '../hooks/usePrayerTimes';
import usePrayerNotifications from '../hooks/usePrayerNotifications';
import useDailyData from '../hooks/useDailyData';
import duas, { nightWakeDua } from '../constants/duas';

const FARD_ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

// Which athkar categories get bumped to the front of the list at each part
// of the day — everything in ATHKAR_LINKS always stays visible, this only
// changes the order they're offered in. Order within the array is itself
// the priority order (first = most relevant right now).
const PRIORITY_BY_PERIOD = {
  morning: ['morning', 'wakeup'],
  evening: ['evening'],
  night: ['sleep'],
};

function reorderByPriority(links, period) {
  const priorityKeys = PRIORITY_BY_PERIOD[period];
  if (!priorityKeys || !priorityKeys.length) return links;
  const prioritized = [];
  const rest = [];
  links.forEach((link) => {
    const rank = priorityKeys.indexOf(link.key);
    if (rank === -1) rest.push(link);
    else prioritized.push({ link, rank });
  });
  prioritized.sort((a, b) => a.rank - b.rank);
  return [...prioritized.map((p) => p.link), ...rest];
}

export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { user, isGuest } = useAuth();
  const date = todayISO();
  // Ticks every second (not just on focus/refresh) so the hero card's
  // countdown reads live, down to the second, like PrayerDetailScreen's.
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const hijri = toHijri(now);
  const { schedule, next, dayPeriod } = usePrayerTimes();
  const { stats, prayerLog, loading, reload } = useDailyData(date);
  // Only true for a genuine first load with nothing cached yet from a
  // previous successful fetch — a slow-but-normal request (a cold Heroku
  // dyno, a weak connection) shows this instead of a misleading "0%" ring.
  // A refetch that already has cached or previously-loaded data never hits
  // this branch, so revisiting Home never flashes a spinner over real
  // content — see useDailyData's cache-first offline fallback.
  const showingFirstLoad = loading && !stats;
  const [refreshing, setRefreshing] = useState(false);

  const remainingToNext = next ? next.time.getTime() - now.getTime() : null;
  const displayRemaining =
    remainingToNext != null && remainingToNext < 0 ? remainingToNext + 24 * 60 * 60 * 1000 : remainingToNext;

  // No bottom tab bar — this row is the whole app's quick-access menu, right
  // under the hero card: everything that used to live in a separate tab
  // (تتبع/الأذكار) is one tap away from Home instead. Colored icon badges
  // (instead of a bare icon) match the "الأذكار"/"أخرى" rows below, so the
  // row reads as one deliberate family instead of five mismatched buttons.
  const PRAYER_MENU = useMemo(
    () => [
      { key: 'tracker', title: 'المتابعة', icon: 'checkbox-outline', route: 'Tracker', color: colors.sage },
      { key: 'times', title: 'المواقيت', icon: 'time-outline', route: 'PrayerDetail', color: colors.amber },
      { key: 'qibla', title: 'القبلة', icon: 'compass-outline', route: 'Qibla', color: colors.clay },
      { key: 'tasbih', title: 'العدّاد', icon: 'sync-outline', route: 'Tasbih', color: '#7C6A9C' },
      { key: 'stats', title: 'إحصائياتي', icon: 'stats-chart-outline', route: 'WeeklyStats', color: '#4E7FA8' },
    ],
    [colors]
  );

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

  // Reordered (never filtered) by the current part of the day — see
  // usePrayerTimes()'s `dayPeriod`. A small "الأنسب الآن" tag on the
  // top pick is what actually makes the reorder legible instead of a
  // silent shuffle nobody notices.
  const orderedAthkarLinks = useMemo(() => reorderByPriority(ATHKAR_LINKS, dayPeriod), [ATHKAR_LINKS, dayPeriod]);
  const topPriorityKey = PRIORITY_BY_PERIOD[dayPeriod]?.[0] ?? null;

  const MORE_LINKS = useMemo(
    () => [
      { key: 'quran', title: 'وِرد القرآن', subtitle: 'ورد يومي من القرآن الكريم', icon: 'book-outline', color: colors.amberDeep, route: 'Quran' },
      { key: 'names', title: 'أسماء الله الحسنى', subtitle: 'الأسماء التسعة والتسعون', icon: 'sparkles-outline', color: colors.sage, route: 'Names' },
      { key: 'duas', title: 'أدعية مأثورة', subtitle: 'من القرآن والسنة', icon: 'hand-left-outline', color: colors.clay, route: 'Duas' },
    ],
    [colors]
  );

  // Rotates through the curated duas roughly once an hour — a light touch
  // of "there's something new here" without any dedicated timer. At night
  // (after Isha, before Fajr) it's replaced with the dua for someone who
  // wakes up in the night, same idea as morning/evening duas just timed to
  // when someone would actually open the app then.
  const hourBucket = Math.floor(now.getTime() / (1000 * 60 * 60));
  const dua = dayPeriod === 'night' ? nightWakeDua : duas[hourBucket % duas.length];

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
          <Bounce onPress={() => navigation.navigate('Search')} style={styles.iconBtn}>
            <Ionicons name="search-outline" size={19} color={colors.ink} />
          </Bounce>
          <Bounce onPress={() => navigation.navigate('Settings')} style={styles.iconBtn}>
            <Ionicons name="settings-outline" size={19} color={colors.ink} />
          </Bounce>
        </View>
      </View>

      <View style={styles.greetingRow}>
        <Image source={require('../../assets/logo.png')} style={styles.greetingLogo} resizeMode="cover" />
        <View style={{ flex: 1 }}>
          <AppText weight="bold" size={22}>
            {greetingFor(now)}
            {!isGuest && user?.name ? `، ${user.name.split(' ')[0]}` : ''}
          </AppText>
          <AppText color={colors.inkSoft} size={13.5} style={{ marginTop: 4 }}>
            {formatWeekday(now)}، {formatGregorian(now)} — {hijri.day} {hijri.month} {hijri.year}هـ
          </AppText>
        </View>
      </View>

      <Bounce scaleTo={0.97} onPress={() => navigation.navigate('Duas')} style={styles.duaStrip}>
        <Ionicons name="hand-left-outline" size={14} color={colors.amberDeep} />
        <AppText size={12.5} weight="semibold" color={colors.amberDeep} style={{ flex: 1 }} numberOfLines={1}>
          {dua.text}
        </AppText>
      </Bounce>

      <Bounce scaleTo={0.98} onPress={() => navigation.navigate('PrayerDetail')}>
        <Card style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <AppText color={colors.accentSoft} size={12.5}>
                الصلاة القادمة
              </AppText>
              <AppText weight="bold" size={22} color={colors.white} style={{ marginTop: 2 }}>
                {next?.label || '—'}
              </AppText>
            </View>
            <View style={styles.countdownWrap}>
              <AppText size={10.5} color={colors.accentSoft} style={{ marginBottom: 3 }}>
                الوقت المتبقي
              </AppText>
              <View style={styles.countdownBadge}>
                <Ionicons name="time-outline" size={13} color={colors.accentDark} />
                <AppText weight="bold" size={14.5} color={colors.accentDark} style={{ marginRight: 4, direction: 'ltr' }}>
                  {formatCountdownWithSeconds(displayRemaining)}
                </AppText>
              </View>
            </View>
          </View>

          <View style={styles.prayerRow}>
            {FARD_ORDER.map((key) => {
              const info = schedule.find((s) => s.key === key);
              const done = Boolean(prayerLog?.fard?.[key]);
              return (
                <View key={key} style={[styles.prayerChip, done && styles.prayerChipDone]}>
                  {done ? <Ionicons name="checkmark-circle" size={16} color={colors.sage} /> : null}
                  <AppText size={12.5} weight="semibold" color={done ? colors.sage : colors.accentSoft}>
                    {info?.label || key}
                  </AppText>
                  <AppText size={11} color={done ? colors.sage : colors.accentSoft}>
                    {info ? formatClock(info.time) : '--:--'}
                  </AppText>
                </View>
              );
            })}
          </View>

          <AppText size={11} color={colors.accentSoft} style={{ marginTop: spacing.md, textAlign: 'center' }}>
            علّم صلاتك من صفحة المتابعة — اضغط هنا للتفاصيل
          </AppText>
        </Card>
      </Bounce>

      <View style={styles.prayerMenuRow}>
        {PRAYER_MENU.map((item) => (
          <Bounce
            key={item.key}
            scaleTo={0.95}
            style={styles.prayerMenuItem}
            onPress={() => navigation.navigate(item.route)}
          >
            <View style={[styles.prayerMenuIcon, { backgroundColor: `${item.color}22` }]}>
              <Ionicons name={item.icon} size={18} color={item.color} />
            </View>
            <AppText weight="semibold" size={11} numberOfLines={1} style={{ marginTop: 6, textAlign: 'center' }}>
              {item.title}
            </AppText>
          </Bounce>
        ))}
      </View>

      <Card style={styles.scoreCard} onPress={() => navigation.navigate('Tracker')}>
        {showingFirstLoad ? (
          <View style={styles.scoreRingLoading}>
            <ActivityIndicator color={colors.amber} />
          </View>
        ) : (
          <ProgressRing percentage={stats?.percentage ?? 0} size={78} strokeWidth={9} />
        )}
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

      <SectionHeader title="الأذكار" actionLabel="كل الفئات" onAction={() => navigation.navigate('AthkarList')} />
      {orderedAthkarLinks.map((item) => (
        <Bounce
          key={item.key}
          scaleTo={0.97}
          style={styles.linkRow}
          onPress={() => navigation.navigate('AthkarCounter', item.params)}
        >
          <View style={[styles.linkIcon, { backgroundColor: `${item.color}22` }]}>
            <Ionicons name={item.icon} size={19} color={item.color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.linkTitleRow}>
              <AppText weight="semibold" size={14}>
                {item.title}
              </AppText>
              {item.key === topPriorityKey ? (
                <View style={styles.nowBadge}>
                  <AppText size={9.5} weight="bold" color={colors.white}>
                    الأنسب الآن
                  </AppText>
                </View>
              ) : null}
            </View>
            <AppText size={11.5} color={colors.inkSoft} style={{ marginTop: 1 }}>
              {item.subtitle}
            </AppText>
          </View>
          <Ionicons name="chevron-back" size={16} color={colors.inkSoft} />
        </Bounce>
      ))}

      <SectionHeader title="أخرى" />
      {MORE_LINKS.map((item) => (
        <Bounce key={item.key} scaleTo={0.97} style={styles.linkRow} onPress={() => navigation.navigate(item.route)}>
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
        </Bounce>
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
    greetingRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    greetingLogo: {
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      // Fixed — the logo artwork itself is drawn on this same cream
      // backdrop, so this never flips with the theme (a themed background
      // here would show as a mismatched square behind it in dark mode).
      backgroundColor: '#FAF5EC',
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
    countdownWrap: { alignItems: 'center' },
    countdownBadge: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      backgroundColor: colors.gold,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.pill,
    },
    // 'row-reverse' reads right-to-left (fajr first/rightmost, isha
    // last/leftmost) — correct given RTL never actually activates inside
    // Expo Go (see App.js), so this is doing the RTL-reading job manually.
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
    // One row, every item the same size and the same fixed height — no
    // wrap, so a longer label never stretches one box taller than the rest.
    prayerMenuRow: {
      flexDirection: 'row-reverse',
      gap: spacing.xs,
      marginTop: spacing.md,
    },
    prayerMenuItem: {
      flex: 1,
      height: 76,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: 2,
    },
    prayerMenuIcon: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
    scoreCard: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      // Guarantees the row is never computed shorter than the ring
      // itself (size=78 below) — belt-and-suspenders against whatever
      // was making this row's auto-height come out too small for it.
      minHeight: 180,
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    // Same footprint as the ring it stands in for, so the card never
    // reflows once real data (or a cached snapshot) replaces it.
    scoreRingLoading: {
      width: 78,
      height: 78,
      alignItems: 'center',
      justifyContent: 'center',
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
    linkTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.xs },
    nowBadge: {
      backgroundColor: colors.amberDeep,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
  });
}
