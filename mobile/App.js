import 'react-native-gesture-handler';
import React, { useCallback, useEffect } from 'react';
import { I18nManager, LogBox, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import {
  useFonts,
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from '@expo-google-fonts/cairo';
// A proper Uthmani Quran-script font — Cairo (a modern UI sans-serif) has
// no glyphs for the special Quranic marks (open tanween, etc.) the
// official mushaf text below actually uses, so the Quran reader needs its
// own typeface rather than sharing the app's UI font.
import { AmiriQuran_400Regular } from '@expo-google-fonts/amiri-quran';

import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';
import { ensureAndroidNotificationChannel } from './src/hooks/usePrayerNotifications';
import useAthrCardNotifications from './src/hooks/useAthrCardNotifications';
import useFastingNotifications from './src/hooks/useFastingNotifications';

// Show prayer-time notifications as a banner + sound even while the app is
// open, instead of silently queuing them for the notification tray.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// The whole app is Arabic-first, so force RTL layout direction once at boot.
// This flag only actually takes visual effect after the *native* app
// process restarts (a real device install, TestFlight, or a custom dev
// client) — Expo Go is a single shared host app that can't restart itself
// per-project on a JS reload, so RTL never visually activates there no
// matter how many times the bundle reloads. It's still correct to set
// this now: a real build reads it at native launch and renders properly
// RTL from the first frame.
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

LogBox.ignoreLogs(['new NativeEventEmitter']);

SplashScreen.preventAutoHideAsync().catch(() => {});

// Split out so it can call useTheme() — the provider has to be above it.
function AppShell({ fontsLoaded, onLayoutRootView }) {
  const { colors, scheme } = useTheme();
  useAthrCardNotifications();
  useFastingNotifications();

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    // Required for react-native-gesture-handler's handlers to work reliably
    // (the athkar card's swipe, in particular) — without this root wrapper
    // gesture recognition is flaky-to-broken on Android in particular.
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }} onLayout={onLayoutRootView}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    AmiriQuran_400Regular,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  useEffect(() => {
    ensureAndroidNotificationChannel().catch(() => {});
  }, []);

  return (
    <ThemeProvider>
      <AppShell fontsLoaded={fontsLoaded} onLayoutRootView={onLayoutRootView} />
    </ThemeProvider>
  );
}
