import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import useDoneAnim from '../hooks/useDoneAnim';
import PopIcon from './PopIcon';
import AppText from './AppText';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// The tap target for counting through one dhikr on the counter card — its
// own component, deliberately not sharing structure with ProgressRing (the
// small stats ring on Home/Tracker) or the generic Bounce press-wrapper.
//
// Overlaying the label used to rely on `position: 'absolute'` (an
// absoluteFill label View stacked over the Svg) — through three attempts at
// getting that container structure right, it kept rendering the label
// outside the ring instead of centered inside it. Rebuilt without any
// absolute positioning at all: the Svg renders normally (it takes up real
// layout space, size×size), and the label View directly after it uses
// `marginTop: -size` to pull itself back up on top of the Svg — plain box
// model, no positioning-context assumptions, nothing to get subtly wrong.
// The soft background disc is now just a third, filled `Circle` drawn
// first inside the same Svg (behind the track/progress circles) instead of
// a separately-overlaid layer — one less thing that has to line up.
export default function AthkarCountRing({ itemKey, count, target, size = 112, strokeWidth = 10, onPress, onComplete }) {
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
  const discColor = doneAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.amberSoft, colors.sageSoft] });
  const dashOffset = progress.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] });

  // Press feedback lives on this component directly — no Bounce dependency
  // — a plain native-driven spring on the whole ring.
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

  // This ring is one shared component instance reused across whichever
  // dhikr is currently front-and-center (CardBody doesn't remount it per
  // item), so `prevDone` alone can't tell "you just finished this one"
  // apart from "you swiped back to a different item that happens to
  // already be done" — both look like done flipping true. Concretely:
  // finish item A (done: false→true, fires onComplete, auto-advances to
  // B) → B starts at done:false → swipe back to the already-done A →
  // done flips false→true again on the same ref, firing onComplete a
  // second time and auto-advancing forward again, trapping you in a loop
  // the moment you revisit a completed dhikr. `itemKey` (its index) lets
  // a landing on a different item re-sync the baseline silently instead
  // of counting as a completion.
  const prevDone = useRef(done);
  const prevKey = useRef(itemKey);
  useEffect(() => {
    if (prevKey.current !== itemKey) {
      prevKey.current = itemKey;
      prevDone.current = done;
      return;
    }
    if (done && !prevDone.current && onComplete) onComplete();
    prevDone.current = done;
  }, [itemKey, done, onComplete]);

  return (
    <Pressable onPress={onPress} hitSlop={10} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={{ transform: [{ scale: pressScale }] }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: [{ rotate: '-90deg' }] }}>
          <AnimatedCircle cx={size / 2} cy={size / 2} r={radiusValue} fill={discColor} />
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
        {/* Sits directly on top of the Svg via negative margin (not
            position:absolute) — see the note above. */}
        <Animated.View
          style={[
            styles.label,
            { width: size, height: size, marginTop: -size, transform: [{ scale: pop }] },
          ]}
          pointerEvents="none"
        >
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

const styles = StyleSheet.create({
  label: { alignItems: 'center', justifyContent: 'center' },
  subLabel: { marginTop: 3 },
});
