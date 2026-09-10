import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import useDoneAnim from '../hooks/useDoneAnim';
import PopIcon from './PopIcon';
import Bounce from './Bounce';
import AppText from './AppText';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// The tap target for counting through one dhikr on the card screen — fills
// as the repeat count climbs, flips to sage with a checkmark once the
// target is reached. `onPress` should just increment the count by one;
// `onComplete` fires exactly once, the moment the target is first reached,
// so the caller can auto-advance to the next card.
//
// Structured to mirror ProgressRing.js as closely as possible (outer
// sized+centered View > Svg > an absoluteFill label layer) since that
// component is proven to render its centered label correctly.
export default function AthkarCountRing({ count, target, size = 108, strokeWidth = 9, onPress, onComplete }) {
  const { colors } = useTheme();
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
  const dashOffset = progress.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] });

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
    // Bounce *is* the sized container here — no extra plain View wrapping
    // it — so this matches ProgressRing.js's proven structure exactly
    // (one sized+centered container, holding the Svg and an absoluteFill
    // label layer as direct children). An earlier version wrapped an
    // identical inner View in Bounce, one level deeper than ProgressRing;
    // that's the one structural difference between a ring that renders its
    // label and one that silently doesn't.
    <Bounce onPress={onPress} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: [{ rotate: '-90deg' }] }}>
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
      <View style={[StyleSheet.absoluteFillObject, styles.labelLayer]} pointerEvents="none">
        <Animated.View style={{ alignItems: 'center', justifyContent: 'center', transform: [{ scale: pop }] }}>
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
      </View>
    </Bounce>
  );
}

const styles = StyleSheet.create({
  labelLayer: { alignItems: 'center', justifyContent: 'center' },
  subLabel: { marginTop: 3 },
});
