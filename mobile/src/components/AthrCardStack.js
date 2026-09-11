import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import typography from '../theme/typography';
import AppText from './AppText';
import Bounce from './Bounce';
import { cardForDate } from '../constants/athrCards';

// The "أثر" daily card — replaces the old rotating dua sentence, right
// above the "الصلاة القادمة" hero card.
//
// This is deliberately a single plain flow-positioned card, NOT the
// layered "peeking from behind the hero card" deck from the design
// preview — an earlier version built that with position:'absolute' +
// percentage left/right + a rotate transform on two side slivers, and it
// rendered as nothing at all (same class of bug this session hit twice
// already with AthkarCountRing/ProgressRing's label overlays: absolute
// positioning silently not landing where the box model says it should on
// this setup). Same fix as those: stop relying on position:'absolute' —
// this card is a normal sibling in the flow, built exactly like every
// other already-working tappable card in this app (Card, AthkarTile,
// CheckRow). The fanned side-card visual is worth revisiting once this
// baseline is confirmed actually showing up.
export default function AthrCardStack({ date, onPress }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const card = cardForDate(date);

  return (
    <Bounce onPress={onPress} scaleTo={0.97} style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.tag}>
          <AppText size={10} weight="bold" color={colors.amberDeep}>
            {card.tag} اليوم
          </AppText>
        </View>
        <View style={styles.mark}>
          <Image source={require('../../assets/logo.png')} style={styles.markImg} resizeMode="cover" />
        </View>
      </View>
      <AppText numberOfLines={3} style={styles.txt}>
        {card.text}
      </AppText>
    </Bounce>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    card: {
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      marginTop: spacing.md,
      shadowColor: colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    topRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    tag: {
      backgroundColor: colors.amberSoft,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
    },
    mark: {
      width: 24,
      height: 24,
      borderRadius: radius.pill,
      overflow: 'hidden',
      // Fixed — the logo artwork is drawn on this same cream backdrop, so
      // it never flips with the theme (see HomeScreen's greetingLogo).
      backgroundColor: '#FAF5EC',
      borderWidth: 1,
      borderColor: colors.border,
    },
    markImg: { width: '100%', height: '100%' },
    txt: {
      fontFamily: typography.fontDhikr,
      fontSize: 16,
      lineHeight: 24,
      color: colors.ink,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
  });
}
