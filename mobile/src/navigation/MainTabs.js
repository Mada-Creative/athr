import React, { useCallback, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import FloatingTabBar from '../components/FloatingTabBar';
import TabBarScrollContext from '../context/TabBarScrollContext';
import HomeScreen from '../screens/HomeScreen';
import QiblaScreen from '../screens/QiblaScreen';
import TasbihScreen from '../screens/TasbihScreen';
import WeeklyStatsScreen from '../screens/WeeklyStatsScreen';
import MosqueMapScreen from '../screens/MosqueMapScreen';

const Tab = createBottomTabNavigator();

// The app's persistent bottom navigation — replaces the old PRAYER_MENU
// row on Home (المتابعة/المواقيت dropped since their content already lives
// on Home itself: بصمتك اليوم and the hero prayer card). Every tab renders
// its own header (or none, for Home) same as before; only the bottom bar
// is new.
export default function MainTabs() {
  // Keyed by each screen's own route.key, not a single shared value — so
  // switching tabs never shows a bar size left over from whatever the
  // previous tab's scroll position was; each tab remembers only its own.
  const [scrollYByRoute, setScrollYByRoute] = useState({});

  const registerScroll = useCallback(
    (routeKey) => (e) => {
      const raw = e.nativeEvent.contentOffset.y;
      setScrollYByRoute((prev) => {
        const prevVal = prev[routeKey] || 0;
        const next = prevVal + (raw - prevVal) * 0.4;
        if (Math.abs(next - prevVal) < 0.1) return prev;
        return { ...prev, [routeKey]: next };
      });
    },
    []
  );

  return (
    <TabBarScrollContext.Provider value={registerScroll}>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <FloatingTabBar {...props} scrollYByRoute={scrollYByRoute} />}
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
