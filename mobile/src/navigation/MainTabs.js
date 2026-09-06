import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import TrackerScreen from '../screens/TrackerScreen';
import AthkarListScreen from '../screens/AthkarListScreen';
import MoreScreen from '../screens/MoreScreen';
import colors from '../theme/colors';
import typography from '../theme/typography';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: 'home',
  Tracker: 'checkbox',
  AthkarTab: 'moon',
  More: 'grid',
};

function TabIcon({ name, focused }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={`${TAB_ICONS[name]}${focused ? '' : '-outline'}`} size={20} color={focused ? colors.white : colors.inkSoft} />
    </View>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: { fontFamily: typography.fontMedium, fontSize: 11, marginBottom: 4 },
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'الرئيسية' }} />
      <Tab.Screen name="Tracker" component={TrackerScreen} options={{ title: 'المتابعة' }} />
      <Tab.Screen name="AthkarTab" component={AthkarListScreen} options={{ title: 'الأذكار' }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ title: 'المزيد' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    height: 72,
    paddingTop: 8,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: colors.ink },
});
