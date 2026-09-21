import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Bounce from './Bounce';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';

// A floating pill over the content (not docked to the screen edges), same
// idea as a collapsing header but applied to the bottom bar instead: full
// size at the top of the active tab's scroll, eased smaller once scrolling
// starts. Driven by plain state (not Animated.Value/CSS-style transitions)
// updated straight off each screen's onScroll and smoothed with an
// exponential moving average — a fixed-duration transition would chase a
// moving scroll target and read as laggy; tracking the raw (smoothed)
// value every frame is what makes it feel glued to the gesture.
const COLLAPSE_DISTANCE = 90;
const BAR_MAX_HEIGHT = 66;
const BAR_MIN_HEIGHT = 50;
const BAR_MAX_SIDE = 22;
const BAR_MIN_SIDE = 52;
const BAR_MAX_BOTTOM = 12;
const BAR_MIN_BOTTOM = 8;
const BTN_MAX_SIZE = 50;
const BTN_MIN_SIZE = 38;

const TAB_META = {
  Home: { icon: 'home-outline', iconActive: 'home' },
  Qibla: { icon: 'compass-outline', iconActive: 'compass' },
  Tasbih: { icon: 'sync-outline', iconActive: 'sync' },
  WeeklyStats: { icon: 'stats-chart-outline', iconActive: 'stats-chart' },
  MosqueMap: { icon: 'location-outline', iconActive: 'location' },
};

export default function FloatingTabBar({ state, descriptors, navigation, insets, scrollYByRoute }) {
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
  const scrollY = scrollYByRoute[activeRoute.key] || 0;
  const t = Math.min(Math.max(scrollY / COLLAPSE_DISTANCE, 0), 1);

  const barHeight = BAR_MAX_HEIGHT - t * (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT);
  const barSide = BAR_MAX_SIDE + t * (BAR_MIN_SIDE - BAR_MAX_SIDE);
  const barBottom = (insets?.bottom || 0) + BAR_MAX_BOTTOM - t * (BAR_MAX_BOTTOM - BAR_MIN_BOTTOM);
  const btnSize = BTN_MAX_SIZE - t * (BTN_MAX_SIZE - BTN_MIN_SIZE);
  const collapseScale = 1 - t * 0.22;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.bar,
        {
          left: barSide,
          right: barSide,
          bottom: barBottom,
          height: barHeight,
          borderRadius: barHeight / 2,
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
            style={[
              styles.tabBtn,
              {
                width: btnSize,
                height: btnSize,
                backgroundColor: isFocused ? `${color}22` : 'transparent',
              },
            ]}
          >
            <Ionicons
              name={isFocused ? meta.iconActive : meta.icon}
              size={22}
              color={isFocused ? color : colors.inkFaint}
              style={{ transform: [{ scale: collapseScale * (isFocused ? 1.08 : 1) }] }}
            />
          </Bounce>
        );
      })}
    </View>
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
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
