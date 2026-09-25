import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

// Drives a 0→1 Animated.Value that follows a boolean "done" flag, so a
// caller can interpolate a background/border color between its two states
// instead of the color snapping instantly. Starts already at the right end
// so the very first paint of a row never animates in from the wrong state.
export default function useDoneAnim(done, duration = 260) {
  const anim = useRef(new Animated.Value(done ? 1 : 0)).current;
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    Animated.timing(anim, {
      toValue: done ? 1 : 0,
      duration,
      useNativeDriver: false, // color interpolation isn't supported by the native driver
    }).start();
  }, [done, duration, anim]);

  return anim;
}
