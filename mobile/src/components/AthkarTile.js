import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import useDoneAnim from '../hooks/useDoneAnim';
import Bounce from './Bounce';
import PopIcon from './PopIcon';
import AppText from './AppText';

// One category tile in a 3-column athkar grid — used by both AthkarListScreen
// (the full "الأذكار" list) and Home's own "الأذكار" section, so both read
// the same way. Icon + title + a slim progress bar that fills as
// completedCount climbs, flipping to sage with a checkmark once done.
//
// The bg/border color fade lives on its own inner Animated.View rather than
// on Bounce's own `style` prop — Bounce already animates its press-scale
// with useNativeDriver: true, and mixing that with this JS-driven color
// fade on the same node crashes at runtime (see useDoneAnim.js).
export default function AthkarTile({
  title,
  icon,
  color,
  completed,
  completedCount,
  totalCount,
  highlighted,
  width,
  onPress,
  onLongPress,
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  // No progress to track at all (a pure reference screen — 99 Names,
  // curated duas — rather than a daily checklist item): render icon +
  // title only, no bar/fraction that would just always read "0 من 0".
  const hasProgress = totalCount > 0 || completed != null;
  // `completed` (not just completedCount >= totalCount) is the real done
  // state — it also covers the quick "mark it all done" override, which
  // deliberately never touches completedCount (see athkarController.js).
  // The bar still shows 100% once done, so it doesn't visually contradict
  // the checkmark/"تم" next to it.
  const done = hasProgress && (Boolean(completed) || (totalCount > 0 && completedCount >= totalCount));
  const pct = done ? 100 : totalCount > 0 ? Math.min(completedCount / totalCount, 1) * 100 : 0;

  const doneAnim = useDoneAnim(done);
  const tileBg = doneAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.surface, colors.sageSoft] });
  const tileBorder = doneAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.border, colors.sage] });

  return (
    <Bounce onPress={onPress} onLongPress={onLongPress} style={{ width }}>
      <Animated.View style={[styles.tile, { backgroundColor: tileBg, borderColor: tileBorder }]}>
        {/* "الأنسب الآن" (most relevant right now) — a small dot instead
            of a text badge, since a tile this size has no room for one. */}
        {highlighted && !done ? <View style={styles.highlightDot} /> : null}
        <View style={[styles.iconWrap, { backgroundColor: done ? colors.sageSoft : `${color}22` }]}>
          <PopIcon name={done ? 'checkmark' : icon} size={17} color={done ? colors.sage : color} />
        </View>
        <AppText weight="bold" size={11} numberOfLines={2} style={styles.title}>
          {title}
        </AppText>
        {hasProgress ? (
          <>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: done ? colors.sage : color }]} />
            </View>
            <AppText size={9.5} weight={done ? 'bold' : 'regular'} color={done ? colors.sage : colors.inkFaint}>
              {/* totalCount can be 0 for a plain done/not-done item (no real
                  item count to speak of, e.g. the Quran wird) — "0 من 0"
                  reads like a bug, so it falls back to a plain label. */}
              {done ? 'تم' : totalCount > 0 ? `${completedCount} من ${totalCount}` : 'لم يتم'}
            </AppText>
          </>
        ) : null}
      </Animated.View>
    </Bounce>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    tile: {
      borderWidth: 1,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xs,
      alignItems: 'center',
      aspectRatio: 4 / 5,
      justifyContent: 'space-between',
    },
    highlightDot: {
      position: 'absolute',
      top: 8,
      left: 8,
      width: 7,
      height: 7,
      borderRadius: radius.pill,
      backgroundColor: colors.amberDeep,
    },
    iconWrap: { width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
    title: { textAlign: 'center', marginTop: spacing.xs },
    barTrack: {
      width: '100%',
      height: 4,
      borderRadius: 3,
      backgroundColor: colors.border,
      overflow: 'hidden',
      marginTop: spacing.xs,
    },
    barFill: { height: '100%', borderRadius: 3 },
  });
}
