import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import AppText from './AppText';
import { spacing } from '../theme/spacing';

// Fixed to match the native splash screen (app.json's `splash` config) and
// the app icon exactly — never theme-reactive — so there's no color flash
// switching from the native splash into this one, light or dark device
// theme alike. Same reasoning as HomeScreen's greeting logo swatch.
const SPLASH_BG = '#FAF5EC';
const SPLASH_INK = '#3A2A1E';

// Shown for as long as RootNavigator is booting the session (the
// device/guest auth call to the API) — the logo scales+fades in, then the
// tagline follows a beat later, so launch reads as one deliberate motion
// instead of a bare spinner. Session bootstrap is usually near-instant, but
// on a cold Heroku dyno it can take a few seconds — the animation settles
// well before that and just holds on screen, no dead air.
export default function BootSplash() {
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 6 }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      ]),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
    ]).start();
  }, [logoScale, logoOpacity, taglineOpacity]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../../assets/logo.png')}
        resizeMode="contain"
        style={[styles.logo, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
      />
      <Animated.View style={{ opacity: taglineOpacity }}>
        <AppText weight="semibold" size={13.5} color={SPLASH_INK} style={styles.tagline}>
          رفيقك اليومي في الصلاة والذكر
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SPLASH_BG,
  },
  logo: {
    width: 120,
    height: 120,
  },
  tagline: {
    marginTop: spacing.lg,
    textAlign: 'center',
    opacity: 0.85,
  },
});
