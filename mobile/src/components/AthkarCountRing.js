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
  // itself) — separate native-driven node from the ring's own JS-driven
  // fill/color above, so the two never fight over a driver the way a
  // shared node would (see useDoneAnim.js for the crash that taught us
  // this the hard way).
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
    <Bounce onPress={onPress} style={styles.wrap}>
      <View style={{ width: size, height: size }}>
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
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <Animated.View style={[styles.center, { transform: [{ scale: pop }] }]}>
            {done ? (
              <PopIcon name="checkmark" size={size * 0.3} color={colors.sage} />
            ) : (
              <AppText weight="bold" size={size * 0.26} color={colors.ink}>
                {count}
              </AppText>
            )}
            <AppText size={size * 0.1} color={colors.inkFaint} style={{ marginTop: 3 }}>
              {done ? 'تم' : `من ${target}`}
            </AppText>
          </Animated.View>
        </View>
      </View>
    </Bounce>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
