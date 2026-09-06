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

// Plain icon + label, tinted together — no background box behind the icon,
// so nothing shifts position when a tab becomes active. A small dot under
// the label is the only extra feedback for "this one's selected".
function TabIcon({ name, focused }) {
  return (
    <View style={styles.iconWrap}>
      <Ionicons
        name={`${TAB_ICONS[name]}${focused ? '' : '-outline'}`}
        size={23}
        color={focused ? colors.ink : colors.inkFaint}
      />
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
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: { fontFamily: typography.fontMedium, fontSize: 11 },
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
    height: 64,
    paddingTop: 6,
  },
  tabItem: { paddingVertical: 2 },
  iconWrap: { alignItems: 'center', justifyContent: 'center', height: 26 },
});
