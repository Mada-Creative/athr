import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

// A small, consistent press-feedback wrapper: scales down slightly on
// press-in and springs back on release/cancel — used anywhere a tap should
// feel more alive than a flat opacity fade (prayer/athkar cells, check
// rows, the tasbih dial). Pass everything Pressable accepts through props.
export default function Bounce({ children, style, scaleTo = 0.94, disabled, ...pressableProps }) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 40,
      bounciness: 8,
    }).start();
  };

  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => !disabled && animateTo(scaleTo)}
      onPressOut={() => !disabled && animateTo(1)}
      {...pressableProps}
    >
      {/* `stretch` first so it's the default, not a floor — any width/flexBasis
          in `style` (menu grid items, fixed-size icon buttons, ...) still wins. */}
      <Animated.View style={[styles.stretch, style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stretch: { alignSelf: 'stretch' },
});
