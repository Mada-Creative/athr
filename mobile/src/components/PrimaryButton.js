import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import AppText from './AppText';
import Bounce from './Bounce';

const VARIANT_STYLE = {
  solid: 'solid',
  outline: 'outline',
  inverted: 'inverted',
  outlineInverted: 'outlineInverted',
};

export default function PrimaryButton({ title, onPress, loading, disabled, variant = 'solid', style }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const styleKey = VARIANT_STYLE[variant] || 'solid';
  const textColor =
    styleKey === 'inverted'
      ? colors.accentDark
      : styleKey === 'outlineInverted'
      ? colors.accentSoft
      : styleKey === 'outline'
      ? colors.ink
      : colors.white;

  return (
    <Bounce
      scaleTo={0.97}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.base, styles[styleKey], (disabled || loading) && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <AppText weight="semibold" color={textColor} size={16}>
          {title}
        </AppText>
      )}
    </Bounce>
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
    // For a CTA placed *on* a fixed-dark (`accentDark`) card surface, where
    // `solid`/`outline` lose contrast — `outline`'s ink-colored border is
    // literally the same color as the card in light mode. Gold fill mirrors
    // the countdown-badge treatment already used on that same surface.
    inverted: { backgroundColor: colors.gold },
    outlineInverted: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.accentSoft },
    disabled: { opacity: 0.5 },
  });
}
