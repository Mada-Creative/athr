import React from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Bounce from './Bounce';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';

// A floating pill over the content (not docked to the screen edges).
// Shrinks smoothly as the active tab's content scrolls, back to full size
// at the top — but purely via a native-driven `transform: scale` (plus a
// matching translateY so it shrinks toward its own bottom edge instead of
// its center), not by animating width/height/left/right through plain JS
// state. Those layout properties can only ever update on the JS thread, so
// however smoothly they were computed, applying them was still bound by
// whatever else the JS thread was doing at that instant — which is what
// read as laggy/artificial while actively scrolling. A transform animates
// on the UI thread once handed off (useNativeDriver: true, wired in
// MainTabs' registerScroll), so it stays glued to the scroll gesture.
const BAR_HEIGHT = 66;
const BAR_SIDE = 22;
const BAR_BOTTOM = 12;
const MIN_SCALE = 0.78;
const COLLAPSE_DISTANCE = 90;

const TAB_META = {
  Home: { icon: 'home-outline', iconActive: 'home' },
  Qibla: { icon: 'compass-outline', iconActive: 'compass' },
  Tasbih: { icon: 'sync-outline', iconActive: 'sync' },
  WeeklyStats: { icon: 'stats-chart-outline', iconActive: 'stats-chart' },
  MosqueMap: { icon: 'location-outline', iconActive: 'location' },
};

export default function FloatingTabBar({ state, descriptors, navigation, insets, scrollAnimByName }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  // Each tab keeps its existing identity color — the same ones the old
  // PRAYER_MENU row used — so nothing about "what color is this thing"
  // changes for the user, just where it lives on screen.
  const TAB_COLORS = {
    Home: colors.amber,
    Qibla: colors.clay,
    Tasbih: '#7C6A9C',
    WeeklyStats: '#4E7FA8',
    MosqueMap: colors.sage,
  };

  const activeRoute = state.routes[state.index];
  const scrollY = scrollAnimByName[activeRoute.name];

  const scale = scrollY.interpolate({
    inputRange: [0, COLLAPSE_DISTANCE],
    outputRange: [1, MIN_SCALE],
    extrapolate: 'clamp',
  });
  // Compensates the scale's own center-anchored shrink so the bar's
  // bottom edge stays visually put and only its top edge comes down —
  // without this the whole pill would shrink symmetrically toward its
  // middle and appear to lift away from the bottom of the screen.
  const translateY = scrollY.interpolate({
    inputRange: [0, COLLAPSE_DISTANCE],
    outputRange: [0, ((1 - MIN_SCALE) * BAR_HEIGHT) / 2],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.bar,
        {
          left: BAR_SIDE,
          right: BAR_SIDE,
          bottom: (insets?.bottom || 0) + BAR_BOTTOM,
          height: BAR_HEIGHT,
          borderRadius: BAR_HEIGHT / 2,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const meta = TAB_META[route.name];
        if (!meta) return null;
        const isFocused = state.index === index;
        const color = TAB_COLORS[route.name];
        const { options } = descriptors[route.key];

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Bounce
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.title || route.name}
            onPress={onPress}
            style={[styles.tabBtn, { backgroundColor: isFocused ? `${color}22` : 'transparent' }]}
          >
            <Ionicons
              name={isFocused ? meta.iconActive : meta.icon}
              size={22}
              color={isFocused ? color : colors.inkFaint}
              style={isFocused ? { transform: [{ scale: 1.08 }] } : null}
            />
          </Bounce>
        );
      })}
    </Animated.View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    bar: {
      position: 'absolute',
      backgroundColor: colors.surface,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingHorizontal: spacing.xs,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    tabBtn: {
      width: 50,
      height: 50,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
