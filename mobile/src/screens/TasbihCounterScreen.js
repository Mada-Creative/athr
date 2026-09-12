import React, { useEffect, useLayoutEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import Bounce from '../components/Bounce';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import typography from '../theme/typography';
import { api } from '../api/client';
import { enqueueAction } from '../utils/pendingActions';

export default function TasbihCounterScreen({ route, navigation }) {
  const { id, text } = route.params;
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

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
    setError(null);
    try {
      if (Haptics?.selectionAsync) Haptics.selectionAsync();
    } catch (err) {
      // haptics unavailable on this platform — ignore
    }
    const path = `/tasbih/${id}/increment`;
    try {
      await api.patch(path);
    } catch (err) {
      // The tap itself still counted locally — never revert it, so a
      // flaky or absent connection doesn't make counting feel broken
      // mid-dhikr. If it's just offline, queue it to sync automatically;
      // only a real server rejection gets surfaced.
      if (err.isNetworkError) {
        await enqueueAction({ method: 'patch', path });
      } else {
        setError('تعذر حفظ العدّ على الخادم');
      }
    }
  };

  const onReset = async () => {
    setCount(0);
    setError(null);
    try {
      if (Haptics?.notificationAsync) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (err) {
      // ignore
    }
    setBusy(true);
    const path = `/tasbih/${id}/reset`;
    try {
      await api.patch(path);
    } catch (err) {
      if (err.isNetworkError) {
        await enqueueAction({ method: 'patch', path });
      } else {
        setError('تعذر حفظ إعادة التصفير');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <View style={styles.textWrap}>
        <AppText size={22} style={{ textAlign: 'center', fontFamily: typography.fontDhikr }}>
          {text}
        </AppText>
      </View>

      <Bounce scaleTo={0.92} onPress={onTap} style={styles.dial}>
        {/* `ink` (not the fixed `accentDark`) on purpose: the dial's own
            background is `amberSoft`, which flips from pale tan to a dark
            brown in dark mode — a fixed dark text color would (and did)
            all but disappear against it there. `ink` flips the opposite
            way, so it reads clearly against amberSoft in both themes. */}
        <AppText weight="bold" size={64} color={colors.ink}>
          {count}
        </AppText>
        <AppText size={13} color={colors.inkSoft} style={{ marginTop: spacing.xs }}>
          اضغط للعدّ
        </AppText>
      </Bounce>

      {error ? (
        <AppText size={12} color={colors.clay} style={{ marginTop: spacing.md, textAlign: 'center' }}>
          {error}
        </AppText>
      ) : null}

      <Bounce onPress={onReset} disabled={busy} style={styles.resetBtn}>
        <Ionicons name="refresh" size={18} color={colors.clay} />
        <AppText weight="semibold" size={14} color={colors.clay} style={{ marginRight: spacing.xs }}>
          إعادة تعيين العداد
        </AppText>
      </Bounce>
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
