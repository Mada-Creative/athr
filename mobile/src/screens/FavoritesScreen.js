import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import AthkarTile from '../components/AthkarTile';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';
import ATHKAR_META from '../constants/athkarMeta';
import { getAllFavorites } from '../utils/favorites';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TILE_GAP = spacing.sm;
const TILE_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - TILE_GAP * 2) / 3;

// One tile per category that has at least one favorite (same AthkarTile grid
// as Home/AthkarListScreen, so this reads as "the same place, filtered" —
// not a different kind of screen) — tapping one opens AthkarCounterScreen in
// its "favoriteItems" mode (see that screen), the exact same swipeable-card
// experience as reading that category's athkar normally, just limited to
// what was starred and never synced to today's real progress.
export default function FavoritesScreen({ navigation }) {
  const { colors } = useTheme();
  const [favorites, setFavorites] = useState([]);

  useFocusEffect(
    useCallback(() => {
      getAllFavorites().then(setFavorites);
    }, [])
  );

  const byCategory = useMemo(() => {
    const groups = {};
    favorites.forEach((f) => {
      if (!groups[f.category]) groups[f.category] = [];
      groups[f.category].push(f);
    });
    return groups;
  }, [favorites]);

  const categories = Object.keys(byCategory);

  if (!categories.length) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl }}>
          <Ionicons name="star-outline" size={40} color={colors.inkFaint} />
          <AppText color={colors.inkSoft} size={14} style={{ marginTop: spacing.md, textAlign: 'center' }}>
            ما ضفت أذكار للمفضلة بعد — اضغط النجمة فوق أي ذكر وهو فاتح بالعدّاد لحفظه هون
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText weight="bold" size={22}>
        المفضلة
      </AppText>
      <AppText color={colors.inkSoft} size={13} style={{ marginTop: 4, marginBottom: spacing.lg }}>
        اضغط أي فئة لقراءة الأذكار الي حفظتها منها
      </AppText>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GAP }}>
        {categories.map((category) => {
          const meta = ATHKAR_META[category] || { title: category, icon: 'star-outline', color: colors.amber };
          const items = byCategory[category];
          return (
            <AthkarTile
              key={category}
              width={TILE_WIDTH}
              title={`${meta.title} (${items.length})`}
              icon={meta.icon}
              color={meta.color}
              onPress={() => navigation.navigate('AthkarCounter', { category, favoriteItems: items })}
            />
          );
        })}
      </View>
    </Screen>
  );
}
