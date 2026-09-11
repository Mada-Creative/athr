import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, RefreshControl, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import Card from '../components/Card';
import ProgressRing from '../components/ProgressRing';
import LiveClock from '../components/LiveClock';
import Bounce from '../components/Bounce';
import AthkarTile from '../components/AthkarTile';
import AthrCardStack, { HERO_OVERLAP } from '../components/AthrCardStack';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import { useAuth } from '../context/AuthContext';
import { todayISO, formatGregorian, formatWeekday, toHijri, greetingFor, voluntaryFastingDay } from '../utils/date';
import usePrayerTimes, { formatCountdownWithSeconds, formatClock } from '../hooks/usePrayerTimes';
import usePrayerNotifications from '../hooks/usePrayerNotifications';
import useAthkarReminderNotifications from '../hooks/useAthkarReminderNotifications';
import useDailyData from '../hooks/useDailyData';
import ATHKAR_META, { ATHKAR_UNLOCK_PRAYER } from '../constants/athkarMeta';
import { afterPrayerCategory } from '../constants/afterPrayerSlots';

const FARD_ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

const SCREEN_WIDTH = Dimensions.get('window').width;
const TILE_GAP = spacing.sm;
const TILE_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - TILE_GAP * 2) / 3;

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
  const { schedule, next } = usePrayerTimes();
  const { stats, prayerLog, loading, reload, toggleVoluntaryFasting } = useDailyData(date);
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

  // Home is pure navigation now — a tap opens the reading/counter screen,
  // nothing here ever marks a category done. Marking-complete (and seeing
  // what's actually done) lives only on Tracker, so the two screens have a
  // real reason to both exist instead of duplicating each other. Also why
  // the 5 "بعد الفجر/الظهر/العصر/المغرب/العشاء" tiles collapse into one
  // "أذكار الصلاة" tile here (Tracker still shows all 5 separately) — see
  // prayerAthkarCategory below for which one it actually opens.
  const lastPassedPrayer = useMemo(() => {
    const passed = schedule.filter((s) => s.time <= now);
    return passed.length ? passed[passed.length - 1] : schedule.find((s) => s.key === 'isha');
  }, [schedule, now]);
  const prayerAthkarCategory = afterPrayerCategory(lastPassedPrayer?.key || 'isha');

  // Only truthy on Monday/Thursday — the tile below only shows up those
  // two days, not a permanent fixture that's just disabled the rest of
  // the week. Standalone streak, not part of "بصمتك اليوم" — see the
  // comment on PrayerLog.voluntaryFasting.
  const fastingDay = voluntaryFastingDay(now);
  const onToggleFasting = useCallback(
    () => toggleVoluntaryFasting(!prayerLog?.voluntaryFasting),
    [toggleVoluntaryFasting, prayerLog?.voluntaryFasting]
  );

  // amberDeep differs between light/dark, so this lives inside the
  // component (recomputed per theme) rather than as a module constant.
  // Quran used to carry its `completed` state here too, same as the athkar
  // tiles did — same fix, same reason: Home is pure navigation, so it's a
  // plain icon+title tile like Names/Duas, and whether today's wird is
  // done only shows on Tracker.
  const MORE_LINKS = useMemo(
    () => [
      {
        key: 'quran',
        title: 'وِرد القرآن',
        icon: 'book-outline',
        color: colors.amberDeep,
        onPress: () => navigation.navigate('Quran'),
      },
      { key: 'names', title: 'أسماء الله الحسنى', icon: 'sparkles-outline', color: colors.sage, onPress: () => navigation.navigate('Names') },
      { key: 'duas', title: 'أدعية مأثورة', icon: 'hand-left-outline', color: colors.clay, onPress: () => navigation.navigate('Duas') },
      // Only on Monday/Thursday. Unlike the athkar tiles above (which are
      // pure navigation now — see the comment on them), there's no "read"
      // screen to send this one to: marking it *is* the whole interaction,
      // so tapping toggles it right here.
      ...(fastingDay
        ? [
            {
              key: 'fasting',
              title: `صيام ${fastingDay}`,
              icon: 'moon-outline',
              color: '#4E7FA8',
              completed: Boolean(prayerLog?.voluntaryFasting),
              onPress: onToggleFasting,
            },
          ]
        : []),
    ],
    [colors, navigation, fastingDay, prayerLog?.voluntaryFasting, onToggleFasting]
  );

  usePrayerNotifications(schedule, user?.prayerNotifications);
  useAthkarReminderNotifications(schedule);

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
            {formatWeekday(now)}، {formatGregorian(now)} — {hijri.day} {hijri.month} {hijri.year}هـ{' '}
            <AppText color={colors.inkFaint} size={11.5}>
              (تقريبي)
            </AppText>
          </AppText>
        </View>
      </View>

      <AthrCardStack date={now} onPress={() => navigation.navigate('AthrCard')} />

      {/* zIndex here isn't decorative — AthrCardStack's own internal
          zIndex (mainCard over its two side cards) can otherwise promote
          that whole row above a later sibling with no zIndex of its own
          at all, which is what actually had the card row painting over
          this hero card instead of tucking in behind it, regardless of
          JSX order or the negative marginTop. Comfortably higher than
          AthrCardStack's highest internal value (2). */}
      <Bounce
        scaleTo={0.98}
        onPress={() => navigation.navigate('PrayerDetail')}
        style={{ marginTop: -HERO_OVERLAP, zIndex: 10 }}
      >
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

      {/* One unmarked grid, not two sections under separate headers — an
          athkar shortcut and "وِرد القرآن"/"أسماء الله"/duas/fasting aren't
          meaningfully different categories to a user glancing at Home, so
          giving them two titled zones just added visual structure the
          content didn't need. */}
      <View style={styles.athkarGrid}>
        {['wakeup', 'morning', 'prayerAthkar', 'evening', 'sleep'].map((key) => {
          // The merged tile isn't a real ATHKAR_META entry — borrow the
          // afterPrayer group's own icon/color (all 5 slots share them) and
          // give it its own title instead of one prayer's specific label.
          const meta = key === 'prayerAthkar' ? { ...ATHKAR_META[afterPrayerCategory('fajr')], title: 'أذكار الصلاة' } : ATHKAR_META[key];
          const category = key === 'prayerAthkar' ? prayerAthkarCategory : key;
          // Same "opens once its time starts" gating as TrackerScreen's
          // prayer columns — the merged tile is never locked (there's
          // always *some* prayer's athkar it can open, even overnight
          // before fajr, via the isha fallback above).
          const unlockPrayerKey = key === 'prayerAthkar' ? null : ATHKAR_UNLOCK_PRAYER[key];
          const unlockPrayer = unlockPrayerKey ? schedule.find((s) => s.key === unlockPrayerKey) : null;
          const locked = Boolean(unlockPrayerKey) && (!unlockPrayer || now < unlockPrayer.time);
          return (
            <AthkarTile
              key={key}
              width={TILE_WIDTH}
              title={meta.title}
              icon={meta.icon}
              color={meta.color}
              locked={locked}
              lockNote={unlockPrayer ? `يفتح بعد صلاة ${unlockPrayer.label}` : undefined}
              onPress={() => navigation.navigate('AthkarCounter', { category })}
            />
          );
        })}
        {MORE_LINKS.map((item) => (
          <AthkarTile
            key={item.key}
            width={TILE_WIDTH}
            title={item.title}
            icon={item.icon}
            color={item.color}
            completed={item.completed}
            completedCount={item.completedCount}
            totalCount={item.totalCount}
            onPress={item.onPress}
          />
        ))}
      </View>
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
    heroCard: {
      // Fixed dark ink surface — deliberately doesn't invert with the theme.
      backgroundColor: colors.accentDark,
      borderColor: colors.accentDark,
      // No marginTop — the Bounce wrapper's own negative marginTop (see
      // HERO_OVERLAP) already sets the spacing, pulling this card up to
      // tuck in behind the card row above it.
      //
      // Extra top padding (beyond Card's own default) so the card row
      // tucking in this deep still lands behind a blank buffer zone at
      // this card's top, never behind "الصلاة القادمة" itself.
      paddingTop: HERO_OVERLAP + spacing.sm,
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
      minHeight: 120,
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
    athkarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GAP, marginTop: spacing.lg, marginBottom: spacing.sm },
  });
}
