import 'react-native-gesture-handler';
import React, { useCallback, useEffect } from 'react';
import { I18nManager, LogBox, View } from 'react-native';
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

import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';
import { ensureAndroidNotificationChannel } from './src/hooks/usePrayerNotifications';

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
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  // A full reload is normally required for forceRTL to take effect on a
  // real device; Expo Go / dev builds pick it up on the next refresh.
}

LogBox.ignoreLogs(['new NativeEventEmitter']);

SplashScreen.preventAutoHideAsync().catch(() => {});

// Split out so it can call useTheme() — the provider has to be above it.
function AppShell({ fontsLoaded, onLayoutRootView }) {
  const { colors, scheme } = useTheme();

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} onLayout={onLayoutRootView}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
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
