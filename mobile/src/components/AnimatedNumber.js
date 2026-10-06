import React, { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import AppText from './AppText';

// Counts from 0 up to `value` on mount (not just on value changes, unlike
// AnimatedPercent) — built for a stats page that only renders these once
// the real numbers have loaded, so "mounts" and "data just arrived" are
// the same moment: a streak card reading "11 يوم" should visibly climb
// there the first time someone sees it, not just appear instantly.
export default function AnimatedNumber({ value, size = 20, weight = 'bold', color, suffix = '', style }) {
  const [display, setDisplay] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    Animated.timing(anim, { toValue: value, duration: 900, useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [value, anim]);

  return (
    <AppText size={size} weight={weight} color={color} style={style}>
      {display}
      {suffix}
    </AppText>
  );
}
