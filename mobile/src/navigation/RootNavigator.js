import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import colors from '../theme/colors';
import typography from '../theme/typography';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import MainTabs from './MainTabs';
import AthkarCounterScreen from '../screens/AthkarCounterScreen';
import AthkarListScreen from '../screens/AthkarListScreen';
import QuranScreen from '../screens/QuranScreen';
import NamesScreen from '../screens/NamesScreen';
import DuasScreen from '../screens/DuasScreen';
import QiblaScreen from '../screens/QiblaScreen';
import WeeklyStatsScreen from '../screens/WeeklyStatsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AddTaskScreen from '../screens/AddTaskScreen';
import SearchScreen from '../screens/SearchScreen';
import TrackerScreen from '../screens/TrackerScreen';

const Stack = createNativeStackNavigator();

const stackHeaderOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.ink,
  headerTitleStyle: { fontFamily: typography.fontSemiBold, fontSize: 16 },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
};

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ ...stackHeaderOptions }}>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Tracker" component={TrackerScreen} options={{ title: 'متابعة العبادات' }} />
      <Stack.Screen name="AthkarList" component={AthkarListScreen} options={{ title: 'الأذكار' }} />
      <Stack.Screen name="AthkarCounter" component={AthkarCounterScreen} options={{ title: '' }} />
      <Stack.Screen name="Quran" component={QuranScreen} options={{ title: 'القرآن الكريم' }} />
      <Stack.Screen name="Names" component={NamesScreen} options={{ title: 'أسماء الله الحسنى' }} />
      <Stack.Screen name="Duas" component={DuasScreen} options={{ title: 'أدعية' }} />
      <Stack.Screen name="Qibla" component={QiblaScreen} options={{ title: 'القبلة' }} />
      <Stack.Screen name="WeeklyStats" component={WeeklyStatsScreen} options={{ title: 'الإحصائيات' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'الإعدادات' }} />
      <Stack.Screen
        name="AddTask"
        component={AddTaskScreen}
        options={{ title: 'إضافة عنصر', presentation: 'modal' }}
      />
      <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'بحث', presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, isBooting } = useAuth();

  if (isBooting) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.amber} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
