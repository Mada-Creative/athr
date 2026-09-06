import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import namesOfAllah from '../constants/namesOfAllah';

export default function NamesScreen() {
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
            <AppText size={11} color={colors.amberDeep} weight="semibold">
              {index + 1}
            </AppText>
            <AppText weight="bold" size={17} style={{ marginTop: 4 }}>
              {item.ar}
            </AppText>
            <AppText size={11.5} color={colors.inkSoft} style={{ marginTop: 4, textAlign: 'center' }}>
              {item.meaning}
            </AppText>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
});
