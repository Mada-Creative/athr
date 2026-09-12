import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import navigationRef from './navigationRef';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AppText from '../components/AppText';
import BootSplash from '../components/BootSplash';
import { spacing } from '../theme/spacing';
import typography from '../theme/typography';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import UpgradeAccountScreen from '../screens/UpgradeAccountScreen';
import HomeScreen from '../screens/HomeScreen';
import AthkarCounterScreen from '../screens/AthkarCounterScreen';
import AthkarListScreen from '../screens/AthkarListScreen';
import QuranScreen from '../screens/QuranScreen';
import QuranSurahListScreen from '../screens/QuranSurahListScreen';
import QuranReaderScreen from '../screens/QuranReaderScreen';
import NamesScreen from '../screens/NamesScreen';
import DuasScreen from '../screens/DuasScreen';
import QiblaScreen from '../screens/QiblaScreen';
import PrayerDetailScreen from '../screens/PrayerDetailScreen';
import WeeklyStatsScreen from '../screens/WeeklyStatsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AddTaskScreen from '../screens/AddTaskScreen';
import SearchScreen from '../screens/SearchScreen';
import TrackerScreen from '../screens/TrackerScreen';
import TasbihScreen from '../screens/TasbihScreen';
import TasbihCounterScreen from '../screens/TasbihCounterScreen';
import AthrCardScreen from '../screens/AthrCardScreen';
import FridaySunnahScreen from '../screens/FridaySunnahScreen';

const Stack = createNativeStackNavigator();

// There is no logged-out state to gate on any more — the app always has a
// session (guest or real) by the time isBooting clears, so this single
// stack is the whole app; Login/Register/Upgrade are just screens someone
// can reach from Settings, not a separate branch. There's also no bottom
// tab bar — Home is the one landing page and everything else (Tracker,
// Athkar, prayer times, tasbih, stats, more) is one tap away from its menu.
function MainStack() {
  const { colors } = useTheme();
  const stackHeaderOptions = {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.ink,
    headerTitleStyle: { fontFamily: typography.fontSemiBold, fontSize: 16 },
    headerShadowVisible: false,
    // v7 renamed the old `headerBackTitleVisible: false` to this — icon-only
    // back button everywhere, never falling back to an English route name.
    headerBackButtonDisplayMode: 'minimal',
  };

  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="AthrCard"
        component={AthrCardScreen}
        // gestureEnabled: false — this is the only modal-presented screen
        // in the whole stack (AthkarCounter/Duas, which share this exact
        // same PanGestureHandler swipe pattern, are plain 'card' screens
        // and swipe fine). A 'modal' presentation on iOS ships its own
        // interactive swipe-to-dismiss gesture recognizer covering the
        // same surface, and it was winning the touch over the screen's own
        // horizontal PanGestureHandler — swiping did nothing, on a real
        // device and not just a simulator/mouse quirk, because both are a
        // native gesture-recognizer conflict, not a JS-side bug. The
        // screen already has its own close button in topRow, so turning
        // off the native dismiss gesture doesn't remove a way out.
        options={{ headerShown: false, presentation: 'modal', gestureEnabled: false }}
      />
      <Stack.Screen name="Tracker" component={TrackerScreen} options={{ title: 'متابعة العبادات' }} />
      <Stack.Screen name="AthkarList" component={AthkarListScreen} options={{ title: 'الأذكار' }} />
      <Stack.Screen name="AthkarCounter" component={AthkarCounterScreen} options={{ title: '' }} />
      <Stack.Screen name="Quran" component={QuranScreen} options={{ title: 'القرآن الكريم' }} />
      <Stack.Screen name="QuranSurahList" component={QuranSurahListScreen} options={{ title: 'القرآن الكريم' }} />
      <Stack.Screen name="QuranReader" component={QuranReaderScreen} options={{ title: '' }} />
      <Stack.Screen name="Names" component={NamesScreen} options={{ title: 'أسماء الله الحسنى' }} />
      <Stack.Screen name="Duas" component={DuasScreen} options={{ title: 'أدعية' }} />
      <Stack.Screen name="FridaySunnah" component={FridaySunnahScreen} options={{ title: 'سنن يوم الجمعة' }} />
      <Stack.Screen name="Qibla" component={QiblaScreen} options={{ title: 'القبلة' }} />
      <Stack.Screen name="PrayerDetail" component={PrayerDetailScreen} options={{ title: 'مواقيت الصلاة' }} />
      <Stack.Screen name="WeeklyStats" component={WeeklyStatsScreen} options={{ title: 'الإحصائيات' }} />
      <Stack.Screen name="Tasbih" component={TasbihScreen} options={{ title: 'العدّاد' }} />
      <Stack.Screen name="TasbihCounter" component={TasbihCounterScreen} options={{ title: '' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'الإعدادات' }} />
      <Stack.Screen
        name="AddTask"
        component={AddTaskScreen}
        options={{ title: 'إضافة عنصر', presentation: 'modal' }}
      />
      <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'بحث', presentation: 'modal' }} />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'تسجيل الدخول', presentation: 'modal' }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'حساب جديد', presentation: 'modal' }}
      />
      <Stack.Screen
        name="UpgradeAccount"
        component={UpgradeAccountScreen}
        options={{ title: 'حفظ بياناتك', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

// Boot failed to get any session at all (no network on first launch, most
// likely) — every screen still renders, but every authenticated request
// would silently 401 forever with no way back, so this stays pinned above
// everything until a retry succeeds.
function SessionFailedBanner() {
  const { colors } = useTheme();
  const { retrySession } = useAuth();
  const styles = createBannerStyles(colors);
  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline-outline" size={16} color={colors.white} />
      <AppText size={12.5} weight="semibold" color={colors.white} style={{ flex: 1 }}>
        تعذّر الاتصال بالخادم — بعض الميزات لن تعمل
      </AppText>
      <TouchableOpacity onPress={retrySession} style={styles.retryBtn}>
        <AppText size={12.5} weight="bold" color={colors.white}>
          إعادة المحاولة
        </AppText>
      </TouchableOpacity>
    </View>
  );
}

// Running on the last confirmed session because the server wasn't reachable
// just now — a normal, fully-supported state (everything still works off
// cached data + local queueing), so this is a quiet neutral strip, never
// the alarming red one above.
function OfflineStrip() {
  const { colors } = useTheme();
  const styles = createBannerStyles(colors);
  return (
    <View style={[styles.banner, { backgroundColor: colors.surfaceMuted, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <Ionicons name="cloud-offline-outline" size={14} color={colors.inkSoft} />
      <AppText size={11.5} color={colors.inkSoft}>
        غير متصل بالإنترنت — التطبيق يعمل ببياناتك المحفوظة وسيتزامن عند عودة الاتصال
      </AppText>
    </View>
  );
}

function createBannerStyles(colors) {
  return StyleSheet.create({
    banner: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.clay,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    retryBtn: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.white,
    },
  });
}

export default function RootNavigator() {
  const { isBooting, sessionFailed, isOffline } = useAuth();

  if (isBooting) {
    return <BootSplash />;
  }

  return (
    <View style={{ flex: 1 }}>
      {sessionFailed ? <SessionFailedBanner /> : isOffline ? <OfflineStrip /> : null}
      <NavigationContainer ref={navigationRef}>
        <MainStack />
      </NavigationContainer>
    </View>
  );
}
