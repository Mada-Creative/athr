import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import Card from '../components/Card';
import { useTheme } from '../context/ThemeContext';
import { useTabBarScroll } from '../context/TabBarScrollContext';
import { radius, spacing } from '../theme/spacing';
import { api } from '../api/client';
import { todayISO } from '../utils/date';

const WEEKDAY_SHORT = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

// Same six buckets the backend's computeDayScore already returns per day
// (statsController.js) — prayers/nawafil/athkar/quran always have a fixed
// non-zero total, so they're always worth their own chart; dailyDeeds/other
// only exist once the user's added a custom task, so those two only show up
// if this particular week actually has any.
const CATEGORY_META = [
  { key: 'prayers', label: 'الفروض', icon: 'checkmark-done-outline', always: true },
  { key: 'nawafil', label: 'السنن والنوافل', icon: 'moon-outline', always: true },
  { key: 'athkar', label: 'الأذكار', icon: 'chatbubble-ellipses-outline', always: true },
  { key: 'quran', label: 'القرآن', icon: 'book-outline', always: true },
  { key: 'dailyDeeds', label: 'عبادات يومية', icon: 'list-outline', always: false },
  { key: 'other', label: 'أخرى', icon: 'ellipsis-horizontal-outline', always: false },
];

// A few different lines per lagging category, so the tip doesn't read as
// the same stuck sentence every week — this is deliberately the seed of
// the more personal coaching we've talked about adding later (streaks,
// the growing-companion idea), kept simple here: real data in, one honest
// and specific nudge out.
const TIPS = {
  prayers: [
    'الصلاة عماد الدين — لو فاتتك فريضة اقضِها بأقرب وقت ممكن ولا تأجلها',
    'لاحظنا بعض الفرائض ناقصة هالأسبوع — ابدأ بصلاة وحدة تثبّت عليها أول',
    'خطوة صغيرة بتفرق: جرب تصلي الفرائض بوقتها هالأسبوع الجاي',
  ],
  nawafil: [
    'من حافظ على أربع ركعات قبل الظهر وأربع بعدها حرّمه الله على النار — نقطة بداية ممتازة',
    'السنن الرواتب سياج للفرائض — جرب تضيف ركعتين بسيطتين اليوم',
    'لاحظنا السنن قليلة هالأسبوع — حتى ركعتين سنة الفجر بداية تستاهل',
  ],
  athkar: [
    'أذكار الصباح والمساء حصنك اليومي — دقيقتين بس تكفي تبدأ فيهن',
    'جرب تخلي الأذكار عادة صغيرة بعد كل صلاة، مو مهمة منفصلة بآخر اليوم',
    'ابدأ بأذكار الصباح بس هالأسبوع، وزيد تدريجيًا',
  ],
  quran: [
    'ولو آية وحدة باليوم — القراءة القليلة المستمرة أفضل من الكثيرة المنقطعة',
    'خصص 5 دقائق بعد صلاة معينة للقرآن وخليها ثابتة كل يوم',
  ],
};

const GOOD_WEEK_TIPS = [
  'أسبوع ممتاز ما شاء الله — استمر على هالوتيرة 👏',
  'إنجاز قوي هالأسبوع، الثبات هو الأهم الآن ✨',
  'ما شاء الله تبارك الله، وتيرة رائعة — كمّل عليها',
];

function ratioColor(ratio, colors) {
  if (ratio >= 0.8) return colors.sage;
  if (ratio >= 0.4) return colors.amber;
  return colors.clay;
}

// The weakest of the four always-tracked categories this week, or null if
// everything's comfortably above 85% — dailyDeeds/other are user-defined
// extras, not counted here, same as they're excluded from the score itself
// when empty.
function weakestCategory(catTotals) {
  let weakest = null;
  for (const key of ['prayers', 'nawafil', 'athkar', 'quran']) {
    const { done, total } = catTotals[key];
    if (total === 0) continue;
    const ratio = done / total;
    if (!weakest || ratio < weakest.ratio) weakest = { key, ratio };
  }
  return weakest && weakest.ratio < 0.85 ? weakest : null;
}

function CategoryCard({ meta, days, colors, styles }) {
  const totalDone = days.reduce((s, d) => s + (d.buckets?.[meta.key]?.done || 0), 0);
  const totalPossible = days.reduce((s, d) => s + (d.buckets?.[meta.key]?.total || 0), 0);
  const pct = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;

  return (
    <Card style={styles.categoryCard}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryTitleRow}>
          <Ionicons name={meta.icon} size={17} color={colors.amberDeep} />
          <AppText weight="semibold" size={14}>
            {meta.label}
          </AppText>
        </View>
        <AppText weight="bold" size={16} color={ratioColor(pct / 100, colors)}>
          {pct}%
        </AppText>
      </View>
      <View style={styles.miniChart}>
        {days.map((d) => {
          const bucket = d.buckets?.[meta.key];
          const ratio = bucket?.total > 0 ? bucket.done / bucket.total : 0;
          const date = new Date(`${d.date}T00:00:00`);
          return (
            <View key={d.date} style={styles.miniBarWrap}>
              <View style={styles.miniBarTrack}>
                <View style={[styles.miniBar, { height: Math.max(4, ratio * 44), backgroundColor: ratioColor(ratio, colors) }]} />
              </View>
              <AppText size={9.5} color={colors.inkFaint} style={{ marginTop: 3 }}>
                {WEEKDAY_SHORT[date.getDay()][0]}
              </AppText>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

export default function WeeklyStatsScreen({ route }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const registerScroll = useTabBarScroll();
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/stats/week?endDate=${todayISO()}`);
        setDays(res.days);
      } catch (err) {
        // keep empty state
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const average = days.length ? Math.round(days.reduce((sum, d) => sum + d.percentage, 0) / days.length) : 0;

  const catTotals = {};
  for (const meta of CATEGORY_META) {
    catTotals[meta.key] = {
      done: days.reduce((s, d) => s + (d.buckets?.[meta.key]?.done || 0), 0),
      total: days.reduce((s, d) => s + (d.buckets?.[meta.key]?.total || 0), 0),
    };
  }
  const weak = weakestCategory(catTotals);
  // Rotates by ISO day-of-year so the tip changes week to week rather than
  // being pinned to whatever the very first day of the array happens to be.
  const dayIndex = days.length ? Math.floor(new Date(`${days[days.length - 1].date}T00:00:00`).getTime() / 86400000) : 0;
  const tip = weak
    ? { icon: CATEGORY_META.find((c) => c.key === weak.key)?.icon, text: TIPS[weak.key][dayIndex % TIPS[weak.key].length] }
    : { icon: 'thumbs-up-outline', text: GOOD_WEEK_TIPS[dayIndex % GOOD_WEEK_TIPS.length] };

  const visibleCategories = CATEGORY_META.filter((meta) => meta.always || catTotals[meta.key]?.total > 0);

  return (
    <Screen
      onScroll={registerScroll(route.name)}
      scrollEventThrottle={16}
      contentStyle={{ paddingBottom: spacing.xxl * 3 }}
    >
      <AppText weight="bold" size={22}>
        إحصائيات الأسبوع
      </AppText>
      <AppText color={colors.inkSoft} size={13.5} style={{ marginTop: 4, marginBottom: spacing.lg }}>
        متوسط إنجازك خلال آخر 7 أيام: {average}%
      </AppText>

      <Card>
        <View style={styles.chart}>
          {days.map((day) => {
            const date = new Date(`${day.date}T00:00:00`);
            const barHeight = Math.max(6, (day.percentage / 100) * 120);
            return (
              <View key={day.date} style={styles.barWrap}>
                <AppText size={10.5} color={colors.inkSoft}>
                  {day.percentage}%
                </AppText>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { height: barHeight, backgroundColor: ratioColor(day.percentage / 100, colors) }]} />
                </View>
                <AppText size={11} color={colors.inkSoft} style={{ marginTop: spacing.xs }}>
                  {WEEKDAY_SHORT[date.getDay()]}
                </AppText>
              </View>
            );
          })}
        </View>
      </Card>

      {!loading && days.length === 0 ? (
        <AppText size={13} color={colors.inkSoft} style={{ textAlign: 'center', marginTop: spacing.lg }}>
          لا توجد بيانات كافية بعد، عد إلى هنا بعد بضعة أيام من الاستخدام
        </AppText>
      ) : null}

      {days.length > 0 ? (
        <>
          <AppText weight="bold" size={16} style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
            تفصيل حسب النوع
          </AppText>
          <View style={styles.categoryGrid}>
            {visibleCategories.map((meta) => (
              <CategoryCard key={meta.key} meta={meta} days={days} colors={colors} styles={styles} />
            ))}
          </View>

          <View style={styles.tipCard}>
            <Ionicons name={tip.icon} size={20} color={colors.amberDeep} />
            <AppText size={13.5} color={colors.inkSoft} style={{ flex: 1, lineHeight: 21 }}>
              {tip.text}
            </AppText>
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    chart: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-end', height: 170 },
    barWrap: { alignItems: 'center', flex: 1 },
    barTrack: { height: 120, justifyContent: 'flex-end', marginTop: 4 },
    bar: { width: 16, borderRadius: radius.sm },

    categoryGrid: { gap: spacing.sm },
    categoryCard: { paddingVertical: spacing.md },
    categoryHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    categoryTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    miniChart: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-end' },
    miniBarWrap: { alignItems: 'center', flex: 1 },
    miniBarTrack: { height: 44, justifyContent: 'flex-end' },
    miniBar: { width: 10, borderRadius: 4 },

    tipCard: {
      flexDirection: 'row-reverse',
      alignItems: 'flex-start',
      gap: spacing.sm,
      backgroundColor: colors.amberSoft,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.lg,
    },
  });
}
