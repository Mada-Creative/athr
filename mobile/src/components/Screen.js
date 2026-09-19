import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';

export default function Screen({ children, scroll = true, contentStyle, refreshControl }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const Wrapper = scroll ? ScrollView : View;
  const wrapperProps = scroll
    ? {
        contentContainerStyle: [styles.content, contentStyle],
        showsVerticalScrollIndicator: false,
        refreshControl,
      }
    : { style: [styles.content, contentStyle] };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <Wrapper {...wrapperProps}>{children}</Wrapper>
    </SafeAreaView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  });
}
