import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import Card from '../components/Card';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { api } from '../api/client';

const WEEKDAY_SHORT = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

export default function WeeklyStatsScreen() {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/stats/week');
        setDays(res.days);
      } catch (err) {
        // keep empty state
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const average = days.length
    ? Math.round(days.reduce((sum, d) => sum + d.percentage, 0) / days.length)
    : 0;

  return (
    <Screen>
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
                  <View style={[styles.bar, { height: barHeight }]} />
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-end', height: 170 },
  barWrap: { alignItems: 'center', flex: 1 },
  barTrack: { height: 120, justifyContent: 'flex-end', marginTop: 4 },
  bar: { width: 16, borderRadius: radius.sm, backgroundColor: colors.amber },
});
