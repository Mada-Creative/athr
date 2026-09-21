import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Bounce from './Bounce';
import AppText from './AppText';
import LiveClock from './LiveClock';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import { formatGregorian, formatWeekday } from '../utils/date';

// Mirrors Instagram's home header: a slim icon bar that never moves, plus a
// "who/when" row underneath it (there: the stories tray; here: the
// logo+greeting+date) that shrinks away as the user scrolls — so the icons
// the user actually taps stay put while the space they need to reach past
// shrinks, keeping everything closer to the scrolling thumb.
const TOP_BAR_HEIGHT = 38;
const HEADER_PADDING_V = spacing.md;
const GREETING_ROW_HEIGHT = 56;
const GREETING_MARGIN_TOP = spacing.md;

export const HEADER_MAX_HEIGHT = HEADER_PADDING_V * 2 + TOP_BAR_HEIGHT + GREETING_MARGIN_TOP + GREETING_ROW_HEIGHT;
export const HEADER_MIN_HEIGHT = HEADER_PADDING_V * 2 + TOP_BAR_HEIGHT;
const COLLAPSE_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

export default function CollapsingHomeHeader({ scrollY, navigation, now, hijri, greetingText }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const headerHeight = scrollY.interpolate({
    inputRange: [0, COLLAPSE_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });
  // Fades/slides/shrinks away over the first half of the collapse distance
  // — by the time the header itself finishes shrinking, the greeting row is
  // already gone rather than getting visibly clipped by the shrinking box.
  const fadeRange = [0, COLLAPSE_DISTANCE * 0.6];
  const greetingOpacity = scrollY.interpolate({ inputRange: fadeRange, outputRange: [1, 0], extrapolate: 'clamp' });
  const greetingTranslateY = scrollY.interpolate({ inputRange: fadeRange, outputRange: [0, -18], extrapolate: 'clamp' });
  const greetingMarginTop = scrollY.interpolate({
    inputRange: [0, COLLAPSE_DISTANCE],
    outputRange: [GREETING_MARGIN_TOP, 0],
    extrapolate: 'clamp',
  });
  const logoScale = scrollY.interpolate({ inputRange: fadeRange, outputRange: [1, 0.7], extrapolate: 'clamp' });
  // The condensed title that takes the greeting's place once collapsed —
  // crossfades in exactly as the full greeting fades out, so the top bar
  // never reads empty mid-scroll.
  const compactOpacity = scrollY.interpolate({
    inputRange: [COLLAPSE_DISTANCE * 0.4, COLLAPSE_DISTANCE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.header, { height: headerHeight }]}>
      <View style={styles.topBar}>
        <LiveClock size={17} />
        <Animated.View style={[styles.compactTitle, { opacity: compactOpacity }]} pointerEvents="none">
          <AppText weight="bold" size={15} numberOfLines={1}>
            {greetingText}
          </AppText>
        </Animated.View>
        <View style={styles.topBarIcons}>
          <Bounce onPress={() => navigation.navigate('Search')} style={styles.iconBtn}>
            <Ionicons name="search-outline" size={19} color={colors.ink} />
          </Bounce>
          <Bounce onPress={() => navigation.navigate('Settings')} style={styles.iconBtn}>
            <Ionicons name="settings-outline" size={19} color={colors.ink} />
          </Bounce>
        </View>
      </View>

      <Animated.View
        style={[
          styles.greetingRow,
          { marginTop: greetingMarginTop, opacity: greetingOpacity, transform: [{ translateY: greetingTranslateY }] },
        ]}
      >
        <Animated.Image
          source={require('../../assets/logo.png')}
          style={[styles.greetingLogo, { transform: [{ scale: 1.6 }, { scale: logoScale }] }]}
          resizeMode="cover"
        />
        <View style={{ flex: 1 }}>
          <AppText weight="bold" size={22} numberOfLines={1}>
            {greetingText}
          </AppText>
          <AppText color={colors.inkSoft} size={13.5} style={{ marginTop: 4 }} numberOfLines={1}>
            {formatWeekday(now)}، {formatGregorian(now)} — {hijri.day} {hijri.month} {hijri.year}هـ
          </AppText>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    header: {
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      paddingHorizontal: spacing.lg,
      paddingTop: HEADER_PADDING_V,
      paddingBottom: HEADER_PADDING_V,
      overflow: 'hidden',
    },
    topBar: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: TOP_BAR_HEIGHT,
    },
    compactTitle: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    topBarIcons: { flexDirection: 'row-reverse', gap: spacing.sm },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    greetingRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: spacing.md,
      height: GREETING_ROW_HEIGHT,
    },
    greetingLogo: {
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      backgroundColor: '#FAF5EC',
      overflow: 'hidden',
    },
  });
}
