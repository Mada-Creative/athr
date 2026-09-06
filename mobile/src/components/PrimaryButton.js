import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import AppText from './AppText';

export default function PrimaryButton({ title, onPress, loading, disabled, variant = 'solid', style }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
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

function createStyles(colors) {
  return StyleSheet.create({
    base: {
      borderRadius: radius.pill,
      paddingVertical: spacing.md + 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // A filled CTA stays this fixed ink-brown in both themes — like any
    // solid button, it doesn't need to invert with the page around it.
    solid: { backgroundColor: colors.accentDark },
    outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.ink },
    disabled: { opacity: 0.5 },
  });
}
