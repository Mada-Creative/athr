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
const MAIN_WIDTH = CONTENT_WIDTH * 0.78;
const SIDE_WIDTH = CONTENT_WIDTH * 0.28;
// The row is allowed to bleed this many total px past CONTENT_WIDTH (split
// both sides) — a small deliberate peek beyond the card's own edges, not
// an accident. OVERLAP is solved backwards from that target so the row's
// actual rendered width is always predictable regardless of device width,
// instead of guessing an overlap ratio and hoping it doesn't blow up wider
// than the screen (which is exactly what happened before this fix: the
// row came out to ~420px on a ~382px-wide content area).
const BLEED = 16;
const OVERLAP = (SIDE_WIDTH * 2 + MAIN_WIDTH - CONTENT_WIDTH - BLEED) / 2;

const MAIN_HEIGHT = 92;
const SIDE_HEIGHT = 66;
const SIDE_TOP_OFFSET = 14;
// HomeScreen pulls the hero prayer card up by this same amount so the
// card row appears to be tucked in behind it — see the Bounce wrapper's
// own negative marginTop there. Exported so the two stay in sync. Small
// on purpose — just enough to read as "tucked behind", not deep enough
// to cover the hero card's own top-row content underneath it.
export const HERO_OVERLAP = 14;

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
//
// RTL: a real device screenshot showed this row's own 'row' rendering
// right-to-left AND a plain-mistake-looking 'row-reverse' elsewhere
// rendering left-to-right — both consistent with I18nManager.isRTL
// actually being true at runtime now (see App.js: forceRTL(true) is
// called on every boot, but only takes visual effect after a native
// process restart, which apparently happened at some point across this
// many-restarts testing session). The rotation signs and topRow's
// flexDirection below are written for that real-RTL reality, not the
// "RTL never activates" assumption most of the rest of this app's
// row-reverse usages were written under — worth a wider look at those.
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
    // obvious rather than huddled in. The rotation signs here are swapped
    // from what "outward" would naively suggest — RTL is active on-device
    // now (see the comment above the component), which flips which
    // physical side each of these two ends up on without touching their
    // own rotate value, so the sign has to be pre-corrected here instead.
    sideLeft: { transform: [{ rotate: '7deg' }], marginRight: -OVERLAP },
    sideRight: { transform: [{ rotate: '-7deg' }], marginLeft: -OVERLAP },
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
    // Plain 'row', not 'row-reverse' — with RTL actually active now (see
    // the note above), 'row' itself already lays out right-to-left, so
    // the tag (first below) lands on the right and the mark on the left
    // without needing the reverse.
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
