import React, { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import AppText from './AppText';

// Counts a "x%" badge up/down to its new value instead of jumping straight
// to it — the reading-progress equivalent of ProgressRing's animated fill,
// for the small numeric badges that sit next to it.
export default function AnimatedPercent({ value, size = 11, weight = 'bold', color, style }) {
  const [display, setDisplay] = useState(value);
  const anim = useRef(new Animated.Value(value)).current;

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    Animated.timing(anim, { toValue: value, duration: 450, useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [value, anim]);

  return (
    <AppText size={size} weight={weight} color={color} style={style}>
      {display}%
    </AppText>
  );
}
