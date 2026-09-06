import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import AppText from './AppText';

export default function CheckRow({ title, subtitle, checked, onToggle, locked, icon = 'moon-outline' }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <TouchableOpacity
      activeOpacity={locked ? 1 : 0.75}
      onPress={locked ? undefined : onToggle}
      style={[styles.row, checked && styles.rowChecked]}
    >
      <View style={[styles.iconWrap, checked && styles.iconWrapChecked]}>
        <Ionicons
          name={locked ? 'lock-closed-outline' : checked ? 'checkmark' : icon}
          size={18}
          color={checked ? colors.white : colors.inkSoft}
        />
      </View>
      <View style={styles.texts}>
        <AppText weight="semibold" size={15}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText size={12.5} color={colors.inkSoft} style={{ marginTop: 2 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      marginBottom: spacing.sm,
      gap: spacing.md,
    },
    rowChecked: { borderColor: colors.sage, backgroundColor: colors.sageSoft },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: radius.pill,
      backgroundColor: colors.backgroundAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapChecked: { backgroundColor: colors.sage },
    texts: { flex: 1 },
  });
}
