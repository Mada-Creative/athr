import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import typography from '../theme/typography';
import namesOfAllah from '../constants/namesOfAllah';

export default function NamesScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <Screen scroll={false} contentStyle={{ flex: 1 }}>
      <AppText weight="bold" size={22} style={{ marginBottom: 4 }}>
        أسماء الله الحسنى
      </AppText>
      <AppText color={colors.inkSoft} size={13.5} style={{ marginBottom: spacing.lg }}>
        {'"وَلِلَّهِ الْأَسْمَاءُ الْحُسْنَىٰ فَادْعُوهُ بِهَا"'}
      </AppText>

      <FlatList
        data={namesOfAllah}
        keyExtractor={(item, index) => `${index}-${item.ar}`}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            <View style={styles.badge}>
              <AppText size={12} color={colors.amberDeep} weight="bold">
                {index + 1}
              </AppText>
            </View>
            <View style={styles.nameWrap}>
              <AppText size={24} style={{ textAlign: 'center', fontFamily: typography.fontDhikr }}>
                {item.ar}
              </AppText>
            </View>
            <AppText size={12} color={colors.inkSoft} style={{ textAlign: 'center' }}>
              {item.meaning}
            </AppText>
          </View>
        )}
      />
    </Screen>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    // Tall/portrait — two per row, same spirit as the athkar tile grid —
    // rather than short squarish boxes, so the name itself gets real room
    // to breathe in the middle of the card.
    card: {
      width: '48%',
      aspectRatio: 3 / 4,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.sm,
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    badge: {
      width: 26,
      height: 26,
      borderRadius: radius.pill,
      backgroundColor: colors.amberSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nameWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });
}
