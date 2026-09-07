import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import AppText from './AppText';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function ProgressRing({ size = 96, strokeWidth = 10, percentage = 0, label, sublabel }) {
  const { colors } = useTheme();
  const radiusValue = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusValue;
  const clamped = Math.max(0, Math.min(100, percentage));

  // Animate the fill itself, not just the number — so marking a prayer
  // reads as the ring visibly catching up, not an instant jump.
  const progress = useRef(new Animated.Value(clamped)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: clamped,
      duration: 600,
      useNativeDriver: false, // strokeDashoffset isn't supported by the native driver
    }).start();
  }, [clamped, progress]);

  const dashOffset = progress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View
      style={{ width: size, height: size, flexShrink: 0, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke={colors.amberSoft}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke={colors.amber}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <View style={styles.center}>
          <AppText weight="bold" size={size * 0.22} color={colors.ink}>
            {label ?? `${clamped}%`}
          </AppText>
          {sublabel ? (
            <AppText size={size * 0.09} color={colors.inkSoft}>
              {sublabel}
            </AppText>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
