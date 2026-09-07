import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import AppText from './AppText';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function ProgressRing({ size = 96, strokeWidth = 10, percentage = 0, label, sublabel }) {
  const { colors } = useTheme();
  const radiusValue = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusValue;
  const clamped = Math.max(0, Math.min(100, percentage));

  // Animate the fill itself, not just the number — so marking a prayer
  // reads as the ring visibly catching up, not an instant jump.
  const progress = useRef(new Animated.Value(clamped)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: clamped,
      duration: 600,
      useNativeDriver: false, // strokeDashoffset isn't supported by the native driver
    }).start();
  }, [clamped, progress]);

  const dashOffset = progress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    // No `overflow: 'hidden'` here — it was added as a self-clip to stop
    // the ring bleeding past its card, but real device screenshots showed
    // it actually broke every ring instance the same way (including
    // WeekRingStrip's, which had never been reported broken at all):
    // showing only the bottom half, uniformly, regardless of percentage —
    // an interaction between overflow:hidden and the Svg's viewBox under
    // this RN/Fabric setup, not the thing it was meant to fix. Removed;
    // see HomeScreen/TrackerScreen for where the actual card-specific
    // bleed is handled instead (a `minHeight` on the row, nothing here).
    <View
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* viewBox pins the SVG's internal coordinate space to exactly its
          own pixel box. The ring needs to start its fill at 12 o'clock,
          not SVG's default 3 o'clock — rotating the whole `<Svg>` via a
          normal RN transform (rather than the `rotation`/`origin` props
          on AnimatedCircle, unreliable paired with an Animated-driven
          strokeDashoffset) does that without touching layout: a square
          rotated 90° about its own center keeps the same bounding box. */}
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: [{ rotate: '-90deg' }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke={colors.amberSoft}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke={colors.amber}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <View style={styles.center}>
          <AppText weight="bold" size={size * 0.22} color={colors.ink}>
            {label ?? `${clamped}%`}
          </AppText>
          {sublabel ? (
            <AppText size={size * 0.09} color={colors.inkSoft}>
              {sublabel}
            </AppText>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
