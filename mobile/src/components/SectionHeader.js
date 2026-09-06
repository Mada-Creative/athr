import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { spacing } from '../theme/spacing';
import AppText from './AppText';

export default function SectionHeader({ title, actionLabel, onAction }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <AppText weight="bold" size={18}>
        {title}
      </AppText>
      {onAction ? (
        <TouchableOpacity style={styles.action} onPress={onAction}>
          <AppText size={13} color={colors.amberDeep} weight="semibold">
            {actionLabel}
          </AppText>
          <Ionicons name="chevron-back" size={14} color={colors.amberDeep} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  action: { flexDirection: 'row-reverse', alignItems: 'center', gap: 2 },
});
