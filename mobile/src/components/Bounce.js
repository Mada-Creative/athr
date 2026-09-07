import React, { useRef } from 'react';
import { Animated, Pressable } from 'react-native';

// Animating Pressable directly — instead of wrapping it around a separate
// Animated.View for the scale transform — means there is only ever ONE
// node carrying the caller's `style`. That single-node shape is what
// actually matters here: every previous version of this component (first
// putting `style` only on the inner node, then on both, then splitting it
// by key) kept breaking a *different* case, because a real flex item's
// sizing, its own children's layout, and how it centers/stretches inside
// its parent all have to agree on being the same node, not something
// spread across two. Concretely, this is what a second node cost:
// - `style`'s flex:1/width only reaching the inner node meant a flex
//   item's sizing never reached the actual flex-participating Pressable
//   (Home's menu row never distributed evenly).
// - A blanket `alignSelf: 'stretch'` fallback on Pressable, needed for
//   plain full-width rows with no sizing of their own, overrode a
//   *parent's* `alignItems: 'center'` for anything with an explicit
//   width/height instead (the tasbih dial rendered pinned to one side
//   instead of centered).
// - The inner node's forced `flex: 1` (to fill Pressable) could collapse
//   to zero instead of falling back to content size when the parent had
//   no defined space to hand out (a reset button with no sizing of its
//   own rendering as an empty outline, content-less).
// With one node, the caller's `style` behaves exactly as it would on a
// plain `<View style={style}>` — sizing, children layout, and how it sits
// in its own parent all come from the same place, the way every other
// component in this app already works.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
    <AnimatedPressable
      disabled={disabled}
      onPressIn={() => !disabled && animateTo(scaleTo)}
      onPressOut={() => !disabled && animateTo(1)}
      style={[style, { transform: [{ scale }] }]}
      {...pressableProps}
    >
      {children}
    </AnimatedPressable>
  );
}
