import React, { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import { api } from '../api/client';
import { todayISO } from '../utils/date';
import { enqueueAction } from '../utils/pendingActions';
import ATHKAR_META from '../constants/athkarMeta';
import athkarContent from '../constants/athkarContent';

export default function AthkarListScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const date = todayISO();
  const [categories, setCategories] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/athkar/${date}`);
      setCategories(res.categories);
    } catch (err) {
      // keep previous state on failure; screen still shows static content
    }
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Same "tap = done, no need to open the counter and go item by item"
  // shortcut as the Tracker screen — someone who already read these on
  // their own, or from a different source entirely, shouldn't be forced to
  // re-tap through every single line just to mark the category complete.
  // Long-press still opens the counter for whoever wants to go through it
  // dhikr by dhikr.
  const onToggleComplete = useCallback(
    async (key) => {
      const current = Boolean(categories[key]?.completed);
      const total = categories[key]?.totalItems ?? athkarContent[key].items.length;
      setCategories((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          completed: !current,
          completedItems: !current ? Array.from({ length: total }, (_, i) => i) : [],
        },
      }));
      const path = `/athkar/${date}/${key}`;
      const body = { completed: !current };
      try {
        await api.patch(path, body);
      } catch (err) {
        if (err.isNetworkError) {
          await enqueueAction({ method: 'patch', path, body });
        } else {
          setCategories((prev) => ({ ...prev, [key]: { ...prev[key], completed: current } }));
        }
      }
    },
    [categories, date]
  );

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.amber} />}>
      <AppText weight="bold" size={22}>
        الأذكار
      </AppText>
      <AppText color={colors.inkSoft} size={13.5} style={{ marginTop: 4, marginBottom: spacing.lg }}>
        اضغط على أي تصنيف لتعليمه مكتملًا — اضغط مطوّلًا لفتحه والعدّ فيه دِكرًا دِكرًا
      </AppText>

      {Object.keys(ATHKAR_META).map((key) => {
        const meta = ATHKAR_META[key];
        const progress = categories[key];
        const total = progress?.totalItems ?? athkarContent[key].items.length;
        const done = progress?.completedItems?.length ?? 0;
        const isDone = progress?.completed;

        return (
          <TouchableOpacity
            key={key}
            style={[styles.card, isDone && styles.cardDone]}
            activeOpacity={0.85}
            onPress={() => onToggleComplete(key)}
            onLongPress={() => navigation.navigate('AthkarCounter', { category: key })}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${meta.color}22` }]}>
              <Ionicons name={isDone ? 'checkmark' : meta.icon} size={22} color={meta.color} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText weight="semibold" size={15}>
                {meta.title}
              </AppText>
              <AppText size={12} color={colors.inkSoft} style={{ marginTop: 2 }}>
                {done}/{total} أذكار مكتملة
              </AppText>
            </View>
            <Ionicons name="chevron-back" size={18} color={colors.inkSoft} />
          </TouchableOpacity>
        );
      })}
    </Screen>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    cardDone: { borderColor: colors.sage, backgroundColor: colors.sageSoft },
    iconWrap: { width: 46, height: 46, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  });
}
