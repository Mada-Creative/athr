import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

// Which style keys govern how *this component* sizes itself inside
// whatever flex container it's placed in, as opposed to how it paints or
// lays out its own children. That split matters because Bounce is really
// two nested nodes (Pressable, then an Animated.View for the scale
// transform) and each of those two concerns has to land on a different
// one of them:
//
// - Sizing (flex, width, alignSelf, ...) has to be on the Pressable — a
//   flex item's sizing only takes effect on whichever node is the
//   *direct* child of the flex container it's laid out in. A caller's
//   flex:1 (e.g. Home's 5-equal-column menu row) landing one level too
//   deep meant every cell shrank to its own content size instead of
//   sharing the row evenly.
// - Everything else (background, border, padding, and the row's own
//   flexDirection/alignItems/gap for laying out `children`) has to stay
//   on the Animated.View, and *only* there — putting it on both would
//   paint the same background/border twice (a visible doubled border,
//   very slightly offset) for no reason, since Animated.View already
//   gets `flex:1` unconditionally below to fill 100% of Pressable
//   regardless of Pressable's own layout direction.
//
// `aspectRatio` is deliberately *not* here even though it's a sizing
// property: it needs to stay on the same node as any margin the caller
// set (PrayerCell's marginBottom), because a fixed-size parent shrinks a
// margined child's box to fit, while an auto-sized one — Pressable, with
// only `width` moved out — just grows to include the margin as trailing
// space. Leaving it on Animated.View reproduces the exact original
// behavior; `flex:1` there is a no-op anyway once its parent (Pressable)
// has no defined main-axis size of its own to hand out.
const SIZING_KEYS = [
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'alignSelf',
];

function splitStyle(style) {
  const flat = StyleSheet.flatten(style) || {};
  const sizing = {};
  const rest = {};
  for (const key of Object.keys(flat)) {
    if (SIZING_KEYS.includes(key)) sizing[key] = flat[key];
    else rest[key] = flat[key];
  }
  return [sizing, rest];
}

// A small, consistent press-feedback wrapper: scales down slightly on
// press-in and springs back on release/cancel — used anywhere a tap should
// feel more alive than a flat opacity fade (prayer/athkar cells, check
// rows, the tasbih dial). Pass everything Pressable accepts through props.
export default function Bounce({ children, style, scaleTo = 0.94, disabled, ...pressableProps }) {
  const scale = useRef(new Animated.Value(1)).current;
  const [sizingStyle, restStyle] = splitStyle(style);

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
      style={[styles.stretch, sizingStyle]}
      {...pressableProps}
    >
      <Animated.View style={[styles.fill, restStyle, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stretch: { alignSelf: 'stretch' },
  fill: { flex: 1 },
});
