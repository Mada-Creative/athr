import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';

export default function Screen({
  children,
  scroll = true,
  contentStyle,
  refreshControl,
  header,
  overlay,
  onScroll,
  scrollEventThrottle,
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  // Animated.ScrollView behaves identically to a plain ScrollView for every
  // screen that doesn't pass onScroll — only a collapsing-header screen
  // (HomeScreen) actually drives an Animated.Value off it.
  const Wrapper = scroll ? Animated.ScrollView : View;
  const wrapperProps = scroll
    ? {
        style: styles.scrollFlex,
        contentContainerStyle: [styles.content, contentStyle],
        showsVerticalScrollIndicator: false,
        refreshControl,
        onScroll,
        scrollEventThrottle,
      }
    : { style: [styles.content, contentStyle] };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* A normal (non-absolute) sibling placed before the scroll view — a
          collapsing header (e.g. HomeScreen's) shrinks by animating its own
          height, and since the scroll view below it is flex:1, it grows
          into the freed space in lockstep with the scroll offset instead of
          needing to overlap the content (which would also hide
          RefreshControl's pull-to-refresh spinner underneath it). */}
      {header}
      <Wrapper {...wrapperProps}>{children}</Wrapper>
      {/* A sibling of the scroll view, not a child of it — stays fixed on
          screen (e.g. a floating action button) regardless of how far the
          content underneath has scrolled. */}
      {overlay}
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scrollFlex: { flex: 1 },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  });
}
