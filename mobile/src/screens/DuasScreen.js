import React from 'react';
import { StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import Card from '../components/Card';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';
import duas from '../constants/duas';

export default function DuasScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <Screen>
      <AppText weight="bold" size={22} style={{ marginBottom: 4 }}>
        أدعية مأثورة
      </AppText>
      <AppText color={colors.inkSoft} size={13.5} style={{ marginBottom: spacing.lg }}>
        من القرآن الكريم والسنة النبوية
      </AppText>

      {duas.map((dua, index) => (
        <Card key={index} style={styles.card}>
          <AppText weight="semibold" size={14} color={colors.amberDeep}>
            {dua.title}
          </AppText>
          <AppText size={16} weight="medium" style={styles.text}>
            {dua.text}
          </AppText>
          <AppText size={11.5} color={colors.inkSoft} style={{ marginTop: spacing.sm }}>
            {dua.source}
          </AppText>
        </Card>
      ))}
    </Screen>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    card: { marginBottom: spacing.md },
    text: { lineHeight: 28, marginTop: spacing.sm },
  });
}
