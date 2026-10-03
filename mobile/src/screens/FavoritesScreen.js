import React, { useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import Card from '../components/Card';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import typography from '../theme/typography';
import ATHKAR_META from '../constants/athkarMeta';
import { getAllFavorites, toggleFavorite } from '../utils/favorites';

// Read-only: tap the star again to unfavorite, otherwise this is just for
// going back over whatever you've already saved — no counter, no "done"
// state. The actual counting happens on AthkarCounterScreen, where these
// were favorited from in the first place.
export default function FavoritesScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [favorites, setFavorites] = useState([]);

  const load = useCallback(() => {
    getAllFavorites().then(setFavorites);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRemove = async (entry) => {
    setFavorites((prev) => prev.filter((f) => !(f.category === entry.category && f.text === entry.text)));
    await toggleFavorite(entry.category, entry);
  };

  if (!favorites.length) {
    return (
      <Screen>
        <View style={styles.empty}>
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
        الأذكار الي حفظتها — اضغط النجمة لإزالة أي ذكر
      </AppText>

      {favorites.map((entry, i) => {
        const meta = ATHKAR_META[entry.category] || {};
        const tintColor = meta.color || colors.amber;
        return (
          <Card key={`${entry.category}-${i}`} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.tag, { backgroundColor: `${tintColor}22` }]}>
                <Ionicons name={meta.icon || 'bookmark-outline'} size={12} color={tintColor} />
                <AppText size={11.5} weight="bold" color={tintColor} style={{ marginRight: 4 }}>
                  {entry.label || meta.title || entry.category}
                </AppText>
              </View>
              <TouchableOpacity onPress={() => onRemove(entry)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="star" size={20} color={colors.amber} />
              </TouchableOpacity>
            </View>
            <AppText size={16} color={colors.ink} style={styles.text}>
              {entry.text}
            </AppText>
            {entry.source ? (
              <AppText size={12} color={colors.inkSoft} style={styles.source}>
                {entry.source}
              </AppText>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
    card: { marginBottom: spacing.md },
    cardHeader: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    tag: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
    },
    text: { textAlign: 'right', lineHeight: 26, fontFamily: typography.fontDhikr },
    source: { textAlign: 'right', marginTop: spacing.sm },
  });
}
