import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import typography from '../theme/typography';
import AppText from './AppText';
import Bounce from './Bounce';
import { cardForDate } from '../constants/athrCards';

const CARD_HEIGHT = 100;
// How much of the stack shows above the hero card it peeks out from
// behind — HomeScreen pulls the hero card up by this same amount
// (marginTop: -PEEK_HEIGHT) so the rest of the stack tucks in behind it,
// no absolute-positioned hero card or fixed total height needed. Exported
// so HomeScreen uses the exact same number rather than a duplicated magic
// constant that could drift out of sync.
export const PEEK_HEIGHT = 58;

// The "أثر" daily card — replaces the old rotating dua sentence. Sits right
// above the "الصلاة القادمة" hero card and reads as one deck: two rotated
// slivers fanning outward behind the front card, which shows today's
// card (same one for everyone, see athrCards.js). Tapping opens the
// full-screen swipeable reader (AthrCardScreen).
export default function AthrCardStack({ date, onPress }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const card = cardForDate(date);

  return (
    <View style={styles.zone}>
      <View style={[styles.sideCard, styles.sideRight]} />
      <View style={[styles.sideCard, styles.sideLeft]} />
      <Bounce onPress={onPress} scaleTo={0.97} style={styles.mainCard}>
        <View style={styles.mark}>
          <Image source={require('../../assets/logo.png')} style={styles.markImg} resizeMode="cover" />
        </View>
        <View style={styles.tag}>
          <AppText size={9.5} weight="bold" color={colors.amberDeep}>
            {card.tag} اليوم
          </AppText>
        </View>
        <AppText numberOfLines={2} style={styles.txt}>
          {card.text}
        </AppText>
      </Bounce>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    zone: { height: PEEK_HEIGHT, marginTop: spacing.md },
    sideCard: {
      position: 'absolute',
      top: 8,
      width: '58%',
      height: CARD_HEIGHT - 18,
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    // Fanned OUTWARD — each side card's top edge tilts away from the main
    // card, not toward it, so the stack reads as bold/obvious rather than
    // huddled in.
    sideRight: { right: '1%', transform: [{ rotate: '9deg' }] },
    sideLeft: { left: '1%', transform: [{ rotate: '-9deg' }] },
    mainCard: {
      position: 'absolute',
      top: 0,
      left: '6%',
      right: '6%',
      height: CARD_HEIGHT,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      paddingTop: spacing.sm,
      paddingHorizontal: spacing.lg,
      shadowColor: colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5,
    },
    mark: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 22,
      height: 22,
      borderRadius: radius.pill,
      overflow: 'hidden',
      // Fixed — the logo artwork is drawn on this same cream backdrop, so
      // it never flips with the theme (see HomeScreen's greetingLogo).
      backgroundColor: '#FAF5EC',
      borderWidth: 1,
      borderColor: colors.border,
    },
    markImg: { width: '100%', height: '100%' },
    tag: {
      backgroundColor: colors.amberSoft,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    txt: {
      fontFamily: typography.fontDhikr,
      fontSize: 14.5,
      lineHeight: 21,
      color: colors.ink,
      textAlign: 'center',
      marginTop: 5,
    },
  });
}
