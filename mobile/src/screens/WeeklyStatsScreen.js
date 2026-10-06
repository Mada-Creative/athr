import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import Card from '../components/Card';
import AnimatedNumber from '../components/AnimatedNumber';
import DailyProgressChart from '../components/DailyProgressChart';
import PrayerCalendarHeatmap from '../components/PrayerCalendarHeatmap';
import { useTheme } from '../context/ThemeContext';
import { useTabBarScroll } from '../context/TabBarScrollContext';
import { radius, spacing } from '../theme/spacing';
import { api } from '../api/client';

// Monday-first, matching how the rest of this screen's weekday chart and
// the calendar heatmap read — `weekdayAverage` from the API is indexed
// 0=Sunday..6=Saturday (JS Date convention), this just reorders it for
// display.
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
// Not the first letter of the full name — "الأحد"/"الاثنين" both start
// with "ا" once you strip the definite article, so that collides. These
// are the conventional single-letter day abbreviations instead (same set
// PrayerCalendarHeatmap.js uses), indexed by JS's Sunday=0..Saturday=6.
const WEEKDAY_LETTER = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];

const PRAYER_LABEL = { fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' };
const NAWAFIL_LABEL = {
  fajrSunnah: 'سنة الفجر',
  dhuhrQabliyah: 'سنة الظهر القبلية',
  dhuhrBadiyah: 'سنة الظهر البعدية',
  maghribSunnah: 'سنة المغرب',
  ishaSunnah: 'سنة العشاء',
  duha: 'صلاة الضحى',
  qiyam: 'قيام الليل',
  witr: 'الوتر',
};
const NAWAFIL_ORDER = ['fajrSunnah', 'dhuhrQabliyah', 'dhuhrBadiyah', 'maghribSunnah', 'ishaSunnah', 'duha', 'qiyam', 'witr'];
const ATHKAR_LABEL = { morning: 'أذكار الصباح', evening: 'أذكار المساء', sleep: 'أذكار النوم' };

function barColor(pct, colors) {
  if (pct >= 80) return colors.sage;
  if (pct >= 40) return colors.amber;
  return colors.clay;
}

export default function WeeklyStatsScreen({ route }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const registerScroll = useTabBarScroll();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/stats/overview');
        setOverview(res);
      } catch (err) {
        // keep empty state
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <Screen onScroll={registerScroll(route.name)} scrollEventThrottle={16}>
        <AppText weight="bold" size={22}>
          الإحصائيات
        </AppText>
        <View style={{ alignItems: 'center', marginTop: spacing.xxl * 2 }}>
          <ActivityIndicator color={colors.amber} />
        </View>
      </Screen>
    );
  }

  if (!overview?.hasData) {
    return (
      <Screen onScroll={registerScroll(route.name)} scrollEventThrottle={16}>
        <AppText weight="bold" size={22}>
          الإحصائيات
        </AppText>
        <View style={{ alignItems: 'center', marginTop: spacing.xxl * 2 }}>
          <Ionicons name="bar-chart-outline" size={40} color={colors.inkFaint} />
          <AppText color={colors.inkSoft} size={13.5} style={{ marginTop: spacing.md, textAlign: 'center' }}>
            لا توجد بيانات كافية بعد — عد إلى هنا بعد يوم أو يومين من الاستخدام
          </AppText>
        </View>
      </Screen>
    );
  }

  const { categoryStreaks, perPrayerPct, perNawafilPct, perAthkarPct, quran, weekdayAverage, last14Days, dailySeries } =
    overview;

  return (
    <Screen
      onScroll={registerScroll(route.name)}
      scrollEventThrottle={16}
      contentStyle={{ paddingBottom: spacing.xxl * 3 }}
    >
      <AppText weight="bold" size={22}>
        الإحصائيات
      </AppText>
      <AppText color={colors.inkSoft} size={12.5} style={{ marginTop: 4, marginBottom: spacing.lg, lineHeight: 19 }}>
        هذه الإحصائيات مبنية على الأيام التي سجّلت فيها عبادة واحدة على الأقل ({overview.totalDaysTracked} يوم) —
        الأيام التي لم تفتح فيها التطبيق لا تدخل في حساب النسب.
      </AppText>

      {/* row-reverse: first child renders rightmost — المداومة الحالية
          rightmost, أفضل مداومة middle, المعدل العام leftmost. */}
      <View style={styles.tileRow}>
        <StatTile icon="flame-outline" value={categoryStreaks.prayers.current} suffix=" يوم" label="المداومة الحالية" sub="أيام متتالية حتى الآن" colors={colors} iconColor={colors.clay} />
        <StatTile icon="trophy-outline" value={categoryStreaks.prayers.best} suffix=" يوم" label="أفضل مداومة" sub="أطول سلسلة أيام أتممت فيها الصلوات" colors={colors} iconColor={colors.gold} />
        <StatTile icon="trending-up-outline" value={overview.overallAverage} suffix="%" label="المعدل العام" sub="متوسط نسبة الإنجاز اليومي" colors={colors} />
      </View>

      <SectionTitle title="المداومة حسب القسم" colors={colors} />
      <Card>
        <View style={styles.streakHeaderRow}>
          <AppText size={11.5} color={colors.inkFaint} style={{ flex: 1 }} />
          <AppText size={11.5} weight="semibold" color={colors.inkFaint} style={styles.streakCol}>
            الأفضل
          </AppText>
          <AppText size={11.5} weight="semibold" color={colors.inkFaint} style={styles.streakCol}>
            الحالية
          </AppText>
        </View>
        <StreakRow icon="checkmark-done-outline" label="الصلوات" streak={categoryStreaks.prayers} colors={colors} />
        <StreakRow icon="chatbubble-ellipses-outline" label="الأذكار" streak={categoryStreaks.athkar} colors={colors} />
        <StreakRow icon="book-outline" label="القرآن" streak={categoryStreaks.quran} colors={colors} />
        <StreakRow icon="moon-outline" label="النوافل" streak={categoryStreaks.nawafil} colors={colors} last />
      </Card>

      <SectionTitle title="مسار الإنجاز اليومي" sub="نسبة الإنجاز الكلي يوميًا" colors={colors} />
      <Card>
        <DailyProgressChart data={dailySeries} />
      </Card>

      <SectionTitle title="نسبة إتمام كل صلاة" sub="نسبة الأيام التي أديت فيها كل صلاة" colors={colors} />
      <Card>
        {Object.keys(PRAYER_LABEL).map((key, i) => (
          <PercentBarRow key={key} label={PRAYER_LABEL[key]} pct={perPrayerPct[key]} colors={colors} last={i === 4} />
        ))}
      </Card>

      <SectionTitle title="نسبة إتمام الأذكار" sub="نسبة الأيام التي أتممت فيها كل ورد كاملًا" colors={colors} />
      <Card>
        {Object.keys(ATHKAR_LABEL).map((key, i) => (
          <PercentBarRow key={key} label={ATHKAR_LABEL[key]} pct={perAthkarPct[key]} colors={colors} last={i === 2} />
        ))}
      </Card>

      <SectionTitle title="نسبة المداومة على القرآن" sub="نسبة الأيام التي قرأت فيها وردك من القرآن" colors={colors} />
      <Card>
        <PercentBarRow label="قراءة القرآن" pct={quran.wirdPct} colors={colors} />
        <PercentBarRow label="سورة الكهف (الجمعة)" pct={quran.kahfPct} colors={colors} last />
      </Card>

      <SectionTitle title="نسبة إتمام النوافل والعبادات" sub="نسبة الأيام التي أديت فيها كل نافلة أو عبادة" colors={colors} />
      <Card>
        {NAWAFIL_ORDER.map((key, i) => (
          <PercentBarRow key={key} label={NAWAFIL_LABEL[key]} pct={perNawafilPct[key]} colors={colors} last={i === NAWAFIL_ORDER.length - 1} />
        ))}
      </Card>

      <SectionTitle title="الصلاة — آخر أسبوعين" sub="كل دائرة تمثل يومًا — اللون يعكس عدد الصلوات المؤداة" colors={colors} />
      <Card>
        <PrayerCalendarHeatmap days={last14Days} />
      </Card>

      <SectionTitle title="المعدل حسب اليوم" sub="متوسط نسبة الإنجاز الكلي لكل يوم من أيام الأسبوع" colors={colors} />
      <Card>
        <View style={styles.weekdayChart}>
          {WEEKDAY_ORDER.map((dow) => (
            <WeekdayBar key={dow} label={WEEKDAY_LETTER[dow]} pct={weekdayAverage[dow]} colors={colors} />
          ))}
        </View>
      </Card>

      <View style={styles.noteCard}>
        <AppText size={18} style={{ marginBottom: 4 }}>
          🤍
        </AppText>
        <AppText weight="bold" size={14} style={{ marginBottom: spacing.xs }}>
          وسيلة تنظيمية
        </AppText>
        <AppText size={12.5} color={colors.inkSoft} style={{ lineHeight: 21 }}>
          خاصية المتابعة وسيلة تنظيمية تساعدك على الالتزام بالفرائض والسنن، وليست عبادة بذاتها ولا سنة عن النبي ﷺ؛
          فاجعلها سرًا بينك وبين الله، لا لجمع "الدرجات" ولا للمفاخرة أو الرياء.
        </AppText>
      </View>
    </Screen>
  );
}

function SectionTitle({ title, sub, colors }) {
  return (
    <View style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
      <AppText weight="bold" size={15.5}>
        {title}
      </AppText>
      {sub ? (
        <AppText size={11.5} color={colors.inkSoft} style={{ marginTop: 2 }}>
          {sub}
        </AppText>
      ) : null}
    </View>
  );
}

function StatTile({ icon, value, suffix, label, sub, colors, iconColor }) {
  const styles = createStyles(colors);
  return (
    <Card style={styles.tile}>
      <Ionicons name={icon} size={20} color={iconColor || colors.amberDeep} />
      <AnimatedNumber value={value} suffix={suffix} size={22} color={colors.ink} style={{ marginTop: spacing.xs }} />
      <AppText weight="semibold" size={11.5} style={{ marginTop: 2, textAlign: 'center' }}>
        {label}
      </AppText>
      <AppText size={9.5} color={colors.inkFaint} style={{ marginTop: 2, textAlign: 'center' }} numberOfLines={2}>
        {sub}
      </AppText>
    </Card>
  );
}

function StreakRow({ icon, label, streak, colors, last }) {
  const styles = createStyles(colors);
  return (
    <View style={[styles.streakRow, !last && styles.streakRowBorder]}>
      <View style={{ flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
        <Ionicons name={icon} size={16} color={colors.amberDeep} />
        <AppText weight="semibold" size={13.5}>
          {label}
        </AppText>
      </View>
      <View style={styles.streakCol}>
        <AnimatedNumber value={streak.best} suffix=" يوم" size={13} weight="bold" color={colors.gold} />
      </View>
      <View style={styles.streakCol}>
        <AnimatedNumber value={streak.current} suffix=" يوم" size={13} weight="bold" color={colors.sage} />
      </View>
    </View>
  );
}

// Fill width animates from 0 on mount (this card is only ever rendered
// once the real data has loaded — see WeeklyStatsScreen above — so "mount"
// and "numbers just arrived" are the same moment).
function PercentBarRow({ label, pct, colors, last }) {
  const styles = createStyles(colors);
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, { toValue: pct, duration: 800, useNativeDriver: false }).start();
  }, [pct, widthAnim]);

  const widthPct = widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={[styles.barRow, !last && styles.barRowSpacing]}>
      <AppText size={12.5} color={colors.inkSoft} style={styles.barLabel} numberOfLines={1}>
        {label}
      </AppText>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { width: widthPct, backgroundColor: barColor(pct, colors) }]} />
      </View>
      <AnimatedNumber value={pct} suffix="%" size={12.5} weight="bold" color={colors.ink} style={styles.barPct} />
    </View>
  );
}

function WeekdayBar({ label, pct, colors }) {
  const styles = createStyles(colors);
  const heightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(heightAnim, { toValue: Math.max(4, (pct / 100) * 90), duration: 800, useNativeDriver: false }).start();
  }, [pct, heightAnim]);

  return (
    <View style={styles.weekdayBarWrap}>
      <AppText size={9.5} color={colors.inkSoft}>
        {pct}%
      </AppText>
      <View style={styles.weekdayBarTrack}>
        <Animated.View style={[styles.weekdayBarFill, { height: heightAnim, backgroundColor: barColor(pct, colors) }]} />
      </View>
      <AppText size={11} color={colors.inkSoft} style={{ marginTop: spacing.xs }}>
        {label}
      </AppText>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    tileRow: { flexDirection: 'row-reverse', gap: spacing.sm },
    tile: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },

    streakHeaderRow: { flexDirection: 'row-reverse', marginBottom: spacing.xs },
    streakCol: { width: 64, alignItems: 'center' },
    streakRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: spacing.sm },
    streakRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },

    barRow: { flexDirection: 'row-reverse', alignItems: 'center' },
    barRowSpacing: { marginBottom: spacing.md },
    barPct: { width: 42, textAlign: 'left' },
    barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.backgroundAlt, overflow: 'hidden', marginHorizontal: spacing.sm },
    barFill: { height: '100%', borderRadius: 4 },
    barLabel: { width: 118, textAlign: 'right' },

    weekdayChart: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-end', height: 140 },
    weekdayBarWrap: { alignItems: 'center', flex: 1 },
    weekdayBarTrack: { height: 90, justifyContent: 'flex-end', marginTop: 4 },
    weekdayBarFill: { width: 14, borderRadius: radius.sm },

    noteCard: {
      backgroundColor: colors.amberSoft,
      borderRadius: radius.md,
      padding: spacing.lg,
      marginTop: spacing.xl,
      alignItems: 'center',
    },
  });
}
