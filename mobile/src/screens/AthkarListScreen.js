import React, { useCallback, useState } from 'react';
import { Dimensions, RefreshControl, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import AthkarTile from '../components/AthkarTile';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';
import { api } from '../api/client';
import { todayISO } from '../utils/date';
import { enqueueAction } from '../utils/pendingActions';
import ATHKAR_META, { ATHKAR_ORDER } from '../constants/athkarMeta';
import athkarContent from '../constants/athkarContent';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TILE_GAP = spacing.sm;
// Screen's own side padding (spacing.lg on each edge) plus two gaps between
// three columns — whatever's left over splits three ways.
const TILE_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - TILE_GAP * 2) / 3;

export default function AthkarListScreen({ navigation }) {
  const { colors } = useTheme();
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
        اضغط على أي بطاقة لتعليمها مكتملة — اضغط مطوّلًا لفتحها والعدّ فيها دِكرًا دِكرًا
      </AppText>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GAP }}>
        {ATHKAR_ORDER.map((key) => {
          const meta = ATHKAR_META[key];
          const progress = categories[key];
          const total = progress?.totalItems ?? athkarContent[key].items.length;
          const done = progress?.completedItems?.length ?? 0;

          return (
            <AthkarTile
              key={key}
              width={TILE_WIDTH}
              title={meta.title}
              icon={meta.icon}
              color={meta.color}
              completed={progress?.completed}
              completedCount={done}
              totalCount={total}
              onPress={() => onToggleComplete(key)}
              onLongPress={() => navigation.navigate('AthkarCounter', { category: key })}
            />
          );
        })}
      </View>
    </Screen>
  );
}
