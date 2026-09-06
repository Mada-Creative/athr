import React, { useEffect, useLayoutEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import { api } from '../api/client';

export default function TasbihCounterScreen({ route, navigation }) {
  const { id, text } = route.params;
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: text });
  }, [navigation, text]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/tasbih');
        const mine = res.counters.find((c) => c._id === id);
        if (mine) setCount(mine.count);
      } catch (err) {
        // start from 0 locally; will reconcile once the tap round-trips
      }
    })();
  }, [id]);

  const onTap = async () => {
    setCount((c) => c + 1);
    try {
      if (Haptics?.selectionAsync) Haptics.selectionAsync();
    } catch (err) {
      // haptics unavailable on this platform — ignore
    }
    try {
      await api.patch(`/tasbih/${id}/increment`);
    } catch (err) {
      // will reconcile next time the screen loads with network back
    }
  };

  const onReset = async () => {
    setCount(0);
    try {
      if (Haptics?.notificationAsync) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (err) {
      // ignore
    }
    setBusy(true);
    try {
      await api.patch(`/tasbih/${id}/reset`);
    } catch (err) {
      // will reconcile next time the screen loads with network back
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <View style={styles.textWrap}>
        <AppText weight="bold" size={20} style={{ textAlign: 'center' }}>
          {text}
        </AppText>
      </View>

      <TouchableOpacity activeOpacity={0.85} onPress={onTap} style={styles.dial}>
        <AppText weight="bold" size={64} color={colors.accentDark}>
          {count}
        </AppText>
        <AppText size={13} color={colors.inkSoft} style={{ marginTop: spacing.xs }}>
          اضغط للعدّ
        </AppText>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resetBtn} onPress={onReset} disabled={busy}>
        <Ionicons name="refresh" size={18} color={colors.clay} />
        <AppText weight="semibold" size={14} color={colors.clay} style={{ marginRight: spacing.xs }}>
          إعادة تعيين العداد
        </AppText>
      </TouchableOpacity>
    </Screen>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    textWrap: { position: 'absolute', top: spacing.xl, left: spacing.lg, right: spacing.lg },
    dial: {
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: colors.amberSoft,
      borderWidth: 2,
      borderColor: colors.amber,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resetBtn: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      marginTop: spacing.xxl,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.claySoft,
    },
  });
}
