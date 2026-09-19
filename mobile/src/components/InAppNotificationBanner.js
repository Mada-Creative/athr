import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from './AppText';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import navigationRef from '../navigation/navigationRef';

const AUTO_DISMISS_MS = 6000;

// Which icon fits each notification's target screen — falls back to a
// plain bell for anything not in the map (new notification types don't
// need to remember to register here for the banner to still work).
const SCREEN_ICON = {
  Tracker: 'checkmark-done-outline',
  AthrCard: 'sparkles-outline',
  AthkarCounter: 'chatbubble-ellipses-outline',
  Home: 'moon-outline',
  FridaySunnah: 'star-outline',
};

// addNotificationReceivedListener fires whenever a notification is
// delivered while the app process is alive — including while it's in the
// foreground, regardless of what the notification handler in App.js
// decided about showing the OS banner. That's what makes this a genuine
// "surface it inside the app" banner rather than just a styled copy of
// something the OS was already going to show: App.js's handler actively
// suppresses the native banner while the app is foregrounded (see
// foregroundState.js) so this is the only thing the user sees.
export default function InAppNotificationBanner() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [current, setCurrent] = useState(null);
  const translateY = useRef(new Animated.Value(-200)).current;
  const dismissTimer = useRef(null);
  const dataRef = useRef(null);

  const dismiss = () => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
    Animated.timing(translateY, { toValue: -200, duration: 220, useNativeDriver: true }).start(() => {
      setCurrent(null);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy < -6,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy < 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -30) {
          dismiss();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const content = notification.request.content;
      dataRef.current = content.data;
      setCurrent({ title: content.title, body: content.body, icon: SCREEN_ICON[content.data?.screen] || 'notifications-outline' });

      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      translateY.setValue(-200);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
      dismissTimer.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    });
    return () => {
      sub.remove();
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!current) return null;

  const handlePress = () => {
    const screen = dataRef.current?.screen;
    dismiss();
    if (screen && navigationRef.isReady()) {
      navigationRef.navigate(screen);
    }
  };

  return (
    <Animated.View
      style={[styles.wrap, { transform: [{ translateY }] }]}
      pointerEvents="box-none"
      {...panResponder.panHandlers}
    >
      {/* SafeAreaView (the native-computed one from this same package, not
          the useSafeAreaInsets hook) so this renders correctly without
          needing a SafeAreaProvider ancestor — the app doesn't set one up,
          relying elsewhere (Screen.js) on this same native fallback. */}
      <SafeAreaView edges={['top']} style={styles.safeWrap}>
        <TouchableOpacity activeOpacity={0.9} style={styles.card} onPress={handlePress}>
          <View style={styles.iconWrap}>
            <Ionicons name={current.icon} size={20} color={colors.amberDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText weight="bold" size={13.5} numberOfLines={1}>
              {current.title}
            </AppText>
            <AppText size={12.5} color={colors.inkSoft} numberOfLines={2} style={{ marginTop: 2 }}>
              {current.body}
            </AppText>
          </View>
          <TouchableOpacity hitSlop={10} onPress={dismiss}>
            <Ionicons name="close" size={18} color={colors.inkFaint} />
          </TouchableOpacity>
        </TouchableOpacity>
      </SafeAreaView>
    </Animated.View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 999,
      elevation: 999,
    },
    safeWrap: {
      paddingTop: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    card: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: radius.pill,
      backgroundColor: colors.amberSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
