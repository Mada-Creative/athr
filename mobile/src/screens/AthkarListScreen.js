import React, { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import Bounce from '../components/Bounce';
import PopIcon from '../components/PopIcon';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import { api } from '../api/client';
import { todayISO } from '../utils/date';
import { enqueueAction } from '../utils/pendingActions';
import useDoneAnim from '../hooks/useDoneAnim';
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
      // Summary-only override — leave completedItems exactly as they are,
      // so the counter screen keeps showing what was actually read.
      setCategories((prev) => ({
        ...prev,
        [key]: { ...prev[key], completed: !current },
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
        const isDone = Boolean(progress?.completed);

        return (
          <AthkarRow
            key={key}
            meta={meta}
            done={done}
            total={total}
            isDone={isDone}
            onPress={() => onToggleComplete(key)}
            onLongPress={() => navigation.navigate('AthkarCounter', { category: key })}
          />
        );
      })}
    </Screen>
  );
}

// A single category row — its own component so its color-fade animation can
// use a hook per row without breaking the rules of hooks inside a .map().
function AthkarRow({ meta, done, total, isDone, onPress, onLongPress }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const doneAnim = useDoneAnim(isDone);
  const cardBg = doneAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.surface, colors.sageSoft] });
  const cardBorder = doneAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.border, colors.sage] });

  return (
    <Bounce style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]} onPress={onPress} onLongPress={onLongPress}>
      <View style={[styles.iconWrap, { backgroundColor: `${meta.color}22` }]}>
        <PopIcon name={isDone ? 'checkmark' : meta.icon} size={22} color={meta.color} />
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
    </Bounce>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    iconWrap: { width: 46, height: 46, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  });
}
