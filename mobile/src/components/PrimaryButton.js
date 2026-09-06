import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import AppText from './AppText';

export default function PrimaryButton({ title, onPress, loading, disabled, variant = 'solid', style }) {
  const isOutline = variant === 'outline';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        isOutline ? styles.outline : styles.solid,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.ink : colors.white} />
      ) : (
        <AppText weight="semibold" color={isOutline ? colors.ink : colors.white} size={16}>
          {title}
        </AppText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solid: { backgroundColor: colors.ink },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.ink },
  disabled: { opacity: 0.5 },
});
