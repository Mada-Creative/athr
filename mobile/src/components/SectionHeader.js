import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';
import AppText from './AppText';

// `count` is an optional trailing "x/y" (or any short string) next to the
// title — e.g. "٥/٥" on "الصلوات والنوافل" — so a section's completion
// reads at a glance without opening it.
export default function SectionHeader({ title, count, actionLabel, onAction }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.titleRow}>
        <AppText weight="bold" size={18}>
          {title}
        </AppText>
        {count ? (
          <AppText size={13} color={colors.inkSoft} weight="semibold">
            {count}
          </AppText>
        ) : null}
      </View>
      {onAction ? (
        <TouchableOpacity style={styles.action} onPress={onAction}>
          <AppText size={13} color={colors.amberDeep} weight="semibold">
            {actionLabel}
          </AppText>
          <Ionicons name="chevron-back" size={14} color={colors.amberDeep} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 6 },
  action: { flexDirection: 'row-reverse', alignItems: 'center', gap: 2 },
});
