import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ProgressRing from './ProgressRing';
import AppText from './AppText';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';
import { api } from '../api/client';
import { todayISO } from '../utils/date';

const WEEKDAY_SHORT = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

// "How consistent have I been this week" at a glance — a ring per day
// (today's date circled by its completion %) instead of a bar chart, so it
// reads more like a streak calendar than a report.
//
// `refreshSignal` is anything that changes when today's data changes (e.g.
// the Tracker screen's `stats` object) — refetching only on screen focus
// meant today's ring stayed stale after marking something while already on
// the screen, so it never looked like it was animating at all.
export default function WeekRingStrip({ refreshSignal }) {
  const { colors } = useTheme();
  const [days, setDays] = useState([]);
  const today = todayISO();

  const load = useCallback(async () => {
    try {
      const res = await api.get('/stats/week');
      setDays(res.days);
    } catch (err) {
      // keep previous state; the row just won't update this time
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (refreshSignal !== undefined) load();
  }, [refreshSignal, load]);

  if (!days.length) return null;

  return (
    <View style={styles.row}>
      {days.map((day) => {
        const date = new Date(`${day.date}T00:00:00`);
        const isToday = day.date === today;
        return (
          <View key={day.date} style={styles.item}>
            <ProgressRing
              size={40}
              strokeWidth={3.5}
              percentage={day.percentage}
              label={String(date.getDate())}
            />
            <AppText
              size={10.5}
              weight={isToday ? 'bold' : 'regular'}
              color={isToday ? colors.amberDeep : colors.inkSoft}
              style={{ marginTop: 4 }}
            >
              {WEEKDAY_SHORT[date.getDay()]}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: spacing.lg },
  item: { alignItems: 'center' },
});
