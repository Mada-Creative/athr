import React, { useRef } from 'react';
import { Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import FloatingTabBar from '../components/FloatingTabBar';
import TabBarScrollContext from '../context/TabBarScrollContext';
import HomeScreen from '../screens/HomeScreen';
import QiblaScreen from '../screens/QiblaScreen';
import TasbihScreen from '../screens/TasbihScreen';
import WeeklyStatsScreen from '../screens/WeeklyStatsScreen';
import MosqueMapScreen from '../screens/MosqueMapScreen';

const Tab = createBottomTabNavigator();
const TAB_NAMES = ['Home', 'Qibla', 'Tasbih', 'WeeklyStats', 'MosqueMap'];

// The app's persistent bottom navigation — replaces the old PRAYER_MENU
// row on Home (المتابعة/المواقيت dropped since their content already lives
// on Home itself: بصمتك اليوم and the hero prayer card). Every tab renders
// its own header (or none, for Home) same as before; only the bottom bar
// is new.
export default function MainTabs() {
  // One Animated.Value per tab (not one shared value) — created once and
  // never replaced, so each tab's own scroll position keeps animating
  // independently even while another tab is focused, and switching tabs
  // never shows a bar size left over from a *different* tab's scroll.
  // These are driven with useNativeDriver: true (see registerScroll below)
  // — plain JS-state-driven width/height changes were the reason an
  // earlier version of this bar felt laggy/artificial while scrolling;
  // native-driven values animate on the UI thread regardless of any JS
  // work happening at the same time.
  const scrollAnimByName = useRef(
    TAB_NAMES.reduce((acc, name) => {
      acc[name] = new Animated.Value(0);
      return acc;
    }, {})
  ).current;

  const registerScroll = useRef((name) =>
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollAnimByName[name] } } }], { useNativeDriver: true })
  ).current;

  return (
    <TabBarScrollContext.Provider value={registerScroll}>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <FloatingTabBar {...props} scrollAnimByName={scrollAnimByName} />}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'الرئيسية' }} />
        <Tab.Screen name="Qibla" component={QiblaScreen} options={{ title: 'القبلة' }} />
        <Tab.Screen name="Tasbih" component={TasbihScreen} options={{ title: 'العدّاد' }} />
        <Tab.Screen name="WeeklyStats" component={WeeklyStatsScreen} options={{ title: 'إحصائياتي' }} />
        <Tab.Screen name="MosqueMap" component={MosqueMapScreen} options={{ title: 'خريطة المساجد' }} />
      </Tab.Navigator>
    </TabBarScrollContext.Provider>
  );
}
