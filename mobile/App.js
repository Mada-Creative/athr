import 'react-native-gesture-handler';
import React, { useCallback, useEffect } from 'react';
import { I18nManager, LogBox, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import foregroundState from './src/utils/foregroundState';

// While the app is actually open and in the foreground, InAppNotificationBanner
// (mounted in RootNavigator) shows the app's own banner for a notification the
// instant it's delivered — showing the OS banner on top of that too would be a
// redundant, differently-styled duplicate of the same alert. So the OS banner
// only shows when the app isn't in the foreground to see the in-app one;
// shouldShowList stays true either way so it's still in the notification
// history, and the sound always plays.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: !foregroundState.active,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Explicitly force RTL OFF — not just "don't turn it on". The screens fake
// RTL manually throughout (flexDirection: 'row-reverse', explicit right/
// left positions, etc.), tuned and verified that way under Expo Go, where
// forceRTL never visually activates (it's a single shared host app that
// can't restart itself per project). The first real native build
// (TestFlight) that actually let a real isRTL=true take effect exposed the
// conflict: React Native auto-mirrors 'row'/'row-reverse' once isRTL is
// genuinely true, so every hand-reversed row got mirrored a second time
// and came out backwards (confirmed on the Home screen's greeting logo).
//
// Simply removing the old forceRTL(true) call turned out not to be enough
// on its own to fix that, though — I18nManager's RTL flag is persisted
// natively on the device (in UserDefaults on iOS), independent of the app
// bundle, and survives across builds/updates. A device that ever ran a
// build calling forceRTL(true) keeps isRTL=true from then on even once
// later code stops calling it — nothing ever tells it to go back. A fresh
// install can also default to RTL on its own depending on device locale,
// now that the app declares Arabic as a supported locale (see app.json).
// So this needs an active, unconditional forceRTL(false) every launch, not
// silence. Turning on *real* RTL (which would also fix native, non-RN
// chrome like the stack navigator's push/pop direction) is still a
// legitimate improvement to make later, but needs an actual pass
// converting the hand-reversed rows to plain 'row' first — not a one-line
// toggle.
if (I18nManager.isRTL || I18nManager.doLeftAndRightSwapInRTL) {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
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
    // SafeAreaProvider first — required by @react-navigation/bottom-tabs
    // (MainTabs' floating tab bar reads its `insets` prop from this) and by
    // any future useSafeAreaInsets() call; the app previously got by
    // without one since native-stack's headers are real native chrome that
    // doesn't need it and every screen used the plain SafeAreaView
    // component instead of the hook.
    //
    // GestureHandlerRootView is required for react-native-gesture-handler's
    // handlers to work reliably (the athkar card's swipe, in particular) —
    // without this root wrapper gesture recognition is flaky-to-broken on
    // Android in particular.
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }} onLayout={onLayoutRootView}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
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
