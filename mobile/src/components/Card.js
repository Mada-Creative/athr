import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';

export default function Card({ children, onPress, style, padded = true }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  // Shadow and corner-clipping can't both live on the same node (RN clips
  // the shadow itself along with the content) — the outer view carries the
  // shadow, the inner one clips anything (like a fixed-size ring) that
  // would otherwise bleed past the rounded corner.
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
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    padded: { padding: spacing.lg },
  });
}
