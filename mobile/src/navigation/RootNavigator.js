import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import typography from '../theme/typography';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import UpgradeAccountScreen from '../screens/UpgradeAccountScreen';
import MainTabs from './MainTabs';
import AthkarCounterScreen from '../screens/AthkarCounterScreen';
import AthkarListScreen from '../screens/AthkarListScreen';
import QuranScreen from '../screens/QuranScreen';
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

const Stack = createNativeStackNavigator();

// There is no logged-out state to gate on any more — the app always has a
// session (guest or real) by the time isBooting clears, so this single
// stack is the whole app; Login/Register/Upgrade are just screens someone
// can reach from Settings, not a separate branch.
function MainStack() {
  const { colors } = useTheme();
  const stackHeaderOptions = {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.ink,
    headerTitleStyle: { fontFamily: typography.fontSemiBold, fontSize: 16 },
    headerShadowVisible: false,
    headerBackTitleVisible: false,
  };

  return (
    <Stack.Navigator screenOptions={stackHeaderOptions}>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Tracker" component={TrackerScreen} options={{ title: 'متابعة العبادات' }} />
      <Stack.Screen name="AthkarList" component={AthkarListScreen} options={{ title: 'الأذكار' }} />
      <Stack.Screen name="AthkarCounter" component={AthkarCounterScreen} options={{ title: '' }} />
      <Stack.Screen name="Quran" component={QuranScreen} options={{ title: 'القرآن الكريم' }} />
      <Stack.Screen name="Names" component={NamesScreen} options={{ title: 'أسماء الله الحسنى' }} />
      <Stack.Screen name="Duas" component={DuasScreen} options={{ title: 'أدعية' }} />
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

export default function RootNavigator() {
  const { isBooting } = useAuth();
  const { colors } = useTheme();

  if (isBooting) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.amber} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <MainStack />
    </NavigationContainer>
  );
}
