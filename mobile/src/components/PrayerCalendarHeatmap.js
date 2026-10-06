import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import AppText from './AppText';

const WEEKDAY_LETTER = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']; // Sun..Sat (getDay() order)

function dotColor(day, colors) {
  if (day.excused) return null; // own icon instead of a plain dot — see below
  if (!day.logged) return colors.border;
  if (day.doneCount === 0) return colors.clay;
  if (day.doneCount <= 2) return colors.amber;
  if (day.doneCount <= 4) return colors.gold;
  return colors.sage;
}

// "الصلاة — آخر أسبوعين": each circle is one day, colored by how many of
// the 5 fard prayers were marked done that day. The 14 days split cleanly
// into two 7-day rows that line up as the same weekday per column (day i
// of the older week and day i of the newer week are exactly 7 days apart,
// so they always land on the same weekday) — no separate week-alignment
// math needed, just chunk the chronological list in half.
export default function PrayerCalendarHeatmap({ days }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  if (!days || days.length !== 14) return null;

  const olderWeek = days.slice(0, 7);
  const newerWeek = days.slice(7, 14);
  const headerWeek = olderWeek; // same weekdays as newerWeek, position for position

  return (
    <View>
      <View style={styles.headerRow}>
        {headerWeek.map((day) => (
          <AppText key={day.date} size={11} weight="semibold" color={colors.inkSoft} style={styles.cell}>
            {WEEKDAY_LETTER[new Date(`${day.date}T00:00:00`).getDay()]}
          </AppText>
        ))}
      </View>
      {[olderWeek, newerWeek].map((week, rowIndex) => (
        <View key={rowIndex} style={styles.weekRow}>
          {week.map((day) => {
            const color = dotColor(day, colors);
            return (
              <View key={day.date} style={styles.cell}>
                {day.excused ? (
                  <View style={[styles.dot, { backgroundColor: colors.amberSoft }]}>
                    <Ionicons name="moon" size={13} color={colors.amberDeep} />
                  </View>
                ) : (
                  <View style={[styles.dot, { backgroundColor: color }]} />
                )}
              </View>
            );
          })}
        </View>
      ))}

      <View style={styles.legendRow}>
        <LegendItem color={colors.clay} label="0" />
        <LegendItem color={colors.amber} label="1-2" />
        <LegendItem color={colors.gold} label="3-4" />
        <LegendItem color={colors.sage} label="5" />
        <LegendItem color={colors.border} label="لم يُسجَّل" />
        <LegendIcon icon="moon" label="عذر شرعي" colors={colors} />
      </View>
    </View>
  );
}

function LegendItem({ color, label }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
      <AppText size={10.5} color={colors.inkSoft}>
        {label}
      </AppText>
    </View>
  );
}

function LegendIcon({ icon, label, colors }) {
  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
      <Ionicons name={icon} size={11} color={colors.amberDeep} />
      <AppText size={10.5} color={colors.inkSoft}>
        {label}
      </AppText>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    headerRow: { flexDirection: 'row-reverse', marginBottom: spacing.xs },
    weekRow: { flexDirection: 'row-reverse', marginBottom: spacing.sm },
    cell: { flex: 1, alignItems: 'center' },
    dot: { width: 22, height: 22, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
    legendRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  });
}
