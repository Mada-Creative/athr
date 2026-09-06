import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

export default function Card({ children, onPress, style, padded = true }) {
  const content = <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;

  if (!onPress) return content;

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  padded: { padding: spacing.lg },
});
