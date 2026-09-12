import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';

export default function Card({ children, onPress, style, padded = true }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const content = (
    <View style={styles.shadowWrap}>
      <View style={[styles.card, padded && styles.padded, style]}>{children}</View>
    </View>
  );

  if (!onPress) return content;

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      {content}
    </TouchableOpacity>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    shadowWrap: {
      shadowColor: colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
      borderRadius: radius.md,
    },
    // No `overflow: 'hidden'` here on purpose — it was clipping
    // ProgressRing (a fixed-size SVG child) whenever this row's
    // cross-axis height came out even a little off from the ring's own
    // height during layout: instead of the ring bleeding a few pixels
    // past the rounded corner (a minor cosmetic slip nothing here
    // actually triggers, since padding already keeps content clear of
    // the corners), it was hard-guillotining half the ring off entirely.
    // Losing visible data is strictly worse than a corner nobody sees
    // bled into, so this card doesn't clip its content at all.
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    padded: { padding: spacing.lg },
  });
}
