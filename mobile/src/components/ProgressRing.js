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
    // `overflow: 'hidden'` here is scoped to exactly this ring's own
    // declared size, not its surroundings — so it clips any stray render
    // of the ring itself to its own box (whatever the earlier "ring
    // spills past its card" bug's actual cause is) without ever being
    // able to clip a *sibling* the way Card's old wrapper-level
    // overflow:hidden did.
    <View
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        flexGrow: 0,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Explicit viewBox pins the SVG's internal coordinate space to
          exactly its own pixel box, regardless of platform-specific
          default-viewBox behavior — one less thing that can make the
          painted circle disagree with the declared width/height.
          The ring needs to start its fill at 12 o'clock, not SVG's
          default 3 o'clock — that used to be `rotation`/`origin` props
          on the AnimatedCircle itself, but those silently don't apply
          when paired with an Animated-driven strokeDashoffset (the
          actual cause of every "ring looks wrong" report so far: the
          fill was always sweeping from 3 o'clock, so partial progress
          drew as a bottom-hugging arc instead of a proper clockwise
          ring from the top). Rotating the whole `<Svg>` with a normal
          RN transform instead sidesteps that entirely — a square
          rotated -90° around its own center keeps the exact same
          bounding box, so nothing else about the layout changes. */}
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
