import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ProgressRing from './ProgressRing';
import AppText from './AppText';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
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
//
// `selectedDate`/`onSelectDate` are optional: pass them (Tracker does) to
// make each day tappable and highlight whichever one is currently shown
// instead of always highlighting today — Home leaves them out and gets
// the old read-only, today-highlighted behavior unchanged.
export default function WeekRingStrip({ refreshSignal, selectedDate, onSelectDate }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [days, setDays] = useState([]);
  const today = todayISO();

  const load = useCallback(async () => {
    try {
      // Anchor the 7-day window to the DEVICE's own local date, not
      // whatever the server's clock/timezone thinks "today" is — without
      // this, the backend defaulted to `new Date()` on its own (UTC)
      // clock, which near local midnight in any timezone ahead of UTC
      // computed a window that still ended on *yesterday*, so today's
      // ring never showed up (and the last ring shown — "yesterday" —
      // read as the current/selected day instead).
      const res = await api.get(`/stats/week?endDate=${todayISO()}`);
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
        const isSelected = selectedDate ? day.date === selectedDate : isToday;
        const ItemWrapper = onSelectDate ? TouchableOpacity : View;
        return (
          <ItemWrapper
            key={day.date}
            // Same padding+border box for every day, transparent unless
            // selected — so the currently-viewed day gets an outlined cell
            // (not just bold text) without the row jumping as selection
            // moves from day to day.
            style={[styles.item, isSelected && styles.itemSelected]}
            {...(onSelectDate ? { activeOpacity: 0.7, onPress: () => onSelectDate(day.date) } : {})}
          >
            <ProgressRing
              size={40}
              strokeWidth={3.5}
              percentage={day.percentage}
              label={String(date.getDate())}
            />
            <AppText
              size={10.5}
              weight={isSelected ? 'bold' : 'regular'}
              color={isSelected ? colors.amberDeep : colors.inkSoft}
              style={{ marginTop: 4 }}
            >
              {WEEKDAY_SHORT[date.getDay()]}
            </AppText>
          </ItemWrapper>
        );
      })}
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    // 'row-reverse' reads right-to-left (oldest day first/rightmost, today
    // last/leftmost) — correct given RTL never actually activates inside
    // Expo Go (see App.js), so this is doing the RTL-reading job manually.
    row: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: spacing.lg },
    item: {
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 4,
      borderRadius: radius.md,
      borderWidth: 0,
      borderColor: 'transparent',
    },
    itemSelected: { borderColor: colors.amber },
  });
}
