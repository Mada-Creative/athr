import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// A plain Ionicons that gives itself a small spring "pop" every time its
// `name` changes — a checkmark replacing a category icon, a lock
// appearing/disappearing, .... Used anywhere a toggle swaps an icon, so the
// swap reads as a little celebration instead of an instant snap. Drop-in
// replacement for <Ionicons name size color /> with no other wiring needed.
//
// The scale lives on a wrapping Animated.View rather than
// Animated.createAnimatedComponent(Ionicons) directly — icon components
// from @expo/vector-icons aren't reliably safe to animate that way (icon
// glyphs render via a native font that isn't guaranteed to forward refs
// the way Animated's native-driver wiring expects), and this wrapper gets
// the exact same visual pop without touching the icon itself.
export default function PopIcon({ name, size, color }) {
  const scale = useRef(new Animated.Value(1)).current;
  const prevName = useRef(name);

  useEffect(() => {
    if (prevName.current === name) return;
    prevName.current = name;
    scale.setValue(0.5);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 14 }).start();
  }, [name, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
}
