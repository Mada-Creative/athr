import React from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import typography from '../theme/typography';
import AppText from './AppText';
import Bounce from './Bounce';
import { cardForDate } from '../constants/athrCards';

const SCREEN_WIDTH = Dimensions.get('window').width;
// Screen's own side padding — matches how TILE_WIDTH etc. are computed
// elsewhere in this app.
const CONTENT_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
const MAIN_WIDTH = CONTENT_WIDTH * 0.72;
const SIDE_WIDTH = CONTENT_WIDTH * 0.5;
// How far each side card tucks in behind the main card's edge.
const OVERLAP = SIDE_WIDTH * 0.62;

const MAIN_HEIGHT = 92;
const SIDE_HEIGHT = 66;
const SIDE_TOP_OFFSET = 14;
// HomeScreen pulls the hero prayer card up by this same amount so the
// card row appears to be tucked in behind it — see the Bounce wrapper's
// own negative marginTop there. Exported so the two stay in sync.
export const HERO_OVERLAP = MAIN_HEIGHT - 54;

// The "أثر" daily card, above the "الصلاة القادمة" hero card — a front
// card (today's, see athrCards.js) with two shorter cards fanned out
// behind it to its left/right.
//
// Deliberately built with NO position:'absolute' anywhere — an earlier
// version used it for this exact layout (and, separately, for
// AthkarCountRing's/ProgressRing's label overlays) and it rendered as
// nothing at all on-device, twice. The fan here comes from plain
// row-flex + negative horizontal margins to pull the side cards in
// behind the front one (the same idea, sideways, as the vertical
// negative-margin trick that fixed both of those rings), with zIndex to
// keep the front card painted on top — ordinary flex/zIndex, nothing
// absolutely positioned to silently misplace.
export default function AthrCardStack({ date, onPress }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const card = cardForDate(date);

  return (
    <View style={styles.row}>
      <View style={[styles.sideCard, styles.sideLeft]} />
      <Bounce onPress={onPress} scaleTo={0.97} style={styles.mainCard}>
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
        <AppText numberOfLines={2} style={styles.txt}>
          {card.text}
        </AppText>
      </Bounce>
      <View style={[styles.sideCard, styles.sideRight]} />
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginTop: spacing.md },
    sideCard: {
      width: SIDE_WIDTH,
      height: SIDE_HEIGHT,
      marginTop: SIDE_TOP_OFFSET,
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
      zIndex: 1,
      shadowColor: colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    // Rotated OUTWARD (away from the front card) so the fan reads as
    // obvious rather than huddled in.
    sideLeft: { transform: [{ rotate: '-9deg' }], marginRight: -OVERLAP },
    sideRight: { transform: [{ rotate: '9deg' }], marginLeft: -OVERLAP },
    mainCard: {
      width: MAIN_WIDTH,
      height: MAIN_HEIGHT,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      zIndex: 2,
      shadowColor: colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    topRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    tag: {
      backgroundColor: colors.amberSoft,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
    },
    mark: {
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
    txt: {
      fontFamily: typography.fontDhikr,
      fontSize: 13.5,
      lineHeight: 19,
      color: colors.ink,
      textAlign: 'center',
      marginTop: 6,
    },
  });
}
