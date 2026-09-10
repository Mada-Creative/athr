import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import useDoneAnim from '../hooks/useDoneAnim';
import PopIcon from './PopIcon';
import AppText from './AppText';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// The tap target for counting through one dhikr on the counter card — its
// own component, deliberately NOT sharing structure with ProgressRing (the
// small stats ring on Home/Tracker) or the generic Bounce press-wrapper:
// this ring needs to be its own thing, visually (a soft tinted disc behind
// the stroke, sized for a full-screen card) and structurally.
//
// Layout, spelled out because getting this wrong is what silently broke
// the label before: `Pressable` here is ONLY a tap-target wrapper — it
// carries no size/position styling of its own. The actual sized circle is
// the `Animated.View` directly inside it, a real View (not a Pressable),
// so it reliably gets its own positioning context for the absolutely-filled
// `Svg` behind it. The count/checkmark label is a normal (non-absolute)
// flow child of that same View, centered by its own alignItems/
// justifyContent — with the Svg pulled OUT of flow via absoluteFill, the
// label is the only flow child left, so plain flex centering places it
// dead in the middle without needing any of its own absolute positioning.
export default function AthkarCountRing({ count, target, size = 112, strokeWidth = 10, onPress, onComplete }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const radiusValue = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusValue;
  const done = count >= target;
  const fraction = target > 0 ? Math.min(count, target) / target : 0;

  const progress = useRef(new Animated.Value(fraction)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: fraction, duration: 320, useNativeDriver: false }).start();
  }, [fraction, progress]);

  const doneAnim = useDoneAnim(done);
  const strokeColor = doneAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.amber, colors.sage] });
  const trackColor = doneAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.amberSoft, colors.sageSoft] });
  const dashOffset = progress.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] });

  // Press feedback lives on this component directly — no Bounce dependency
  // — a plain native-driven spring on the sized View itself.
  const pressScale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(pressScale, { toValue: 0.94, useNativeDriver: true, speed: 40, bounciness: 8 }).start();
  const onPressOut = () => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 8 }).start();

  // A small scale "pop" on every tap (and on the completion checkmark
  // itself) — its own native-driven node, kept separate from the ring's
  // JS-driven fill/color above so the two never fight over a driver (see
  // useDoneAnim.js for the crash that taught us this the hard way).
  const pop = useRef(new Animated.Value(1)).current;
  const mountedOnce = useRef(false);
  useEffect(() => {
    if (!mountedOnce.current) {
      mountedOnce.current = true;
      return;
    }
    pop.setValue(0.8);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 26, bounciness: 14 }).start();
  }, [count, pop]);

  const prevDone = useRef(done);
  useEffect(() => {
    if (done && !prevDone.current && onComplete) onComplete();
    prevDone.current = done;
  }, [done, onComplete]);

  return (
    <Pressable onPress={onPress} hitSlop={10} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.ring, { width: size, height: size, transform: [{ scale: pressScale }] }]}>
        <Animated.View style={[StyleSheet.absoluteFillObject, styles.disc, { backgroundColor: trackColor }]} />
        <Svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={[StyleSheet.absoluteFillObject, styles.svgRotate]}
        >
          <Circle cx={size / 2} cy={size / 2} r={radiusValue} stroke={colors.border} strokeWidth={strokeWidth} fill="none" />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radiusValue}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </Svg>
        <Animated.View style={[styles.label, { transform: [{ scale: pop }] }]}>
          {done ? (
            <PopIcon name="checkmark" size={Math.round(size * 0.3)} color={colors.sage} />
          ) : (
            <AppText weight="bold" size={Math.round(size * 0.26)} color={colors.ink}>
              {count}
            </AppText>
          )}
          <AppText size={Math.round(size * 0.1)} color={colors.inkFaint} style={styles.subLabel}>
            {done ? 'تم' : `من ${target}`}
          </AppText>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    ring: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
    disc: { borderRadius: 999, opacity: 0.5 },
    svgRotate: { transform: [{ rotate: '-90deg' }] },
    label: { alignItems: 'center', justifyContent: 'center' },
    subLabel: { marginTop: 3 },
  });
}
