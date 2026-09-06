import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './AppText';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

// One small square in the tracker's per-prayer columns. Exactly one of
// done/locked/excused should be true; plain "pending" is the default.
export default function PrayerCell({ title, icon = 'ellipse-outline', done, locked, excused, onPress }) {
  const disabled = locked || excused || !onPress;

  let bg = colors.surface;
  let borderColor = colors.border;
  let iconColor = colors.inkSoft;
  let displayIcon = icon;

  if (excused) {
    bg = '#EFE9F5';
    borderColor = '#C9B8E0';
    iconColor = '#7C5FA6';
    displayIcon = 'moon';
  } else if (done) {
    bg = colors.sageSoft;
    borderColor = colors.sage;
    iconColor = colors.sage;
    displayIcon = 'checkmark';
  } else if (locked) {
    bg = colors.backgroundAlt;
    borderColor = colors.border;
    iconColor = colors.inkFaint;
    displayIcon = 'lock-closed';
  }

  return (
    <TouchableOpacity
      activeOpacity={disabled ? 1 : 0.75}
      disabled={disabled}
      onPress={onPress}
      style={[styles.cell, { backgroundColor: bg, borderColor }]}
    >
      <Ionicons name={displayIcon} size={16} color={iconColor} />
      <AppText size={9.5} weight="semibold" color={iconColor} style={styles.label} numberOfLines={1}>
        {title}
      </AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
  },
  label: { marginTop: 3, textAlign: 'center' },
});
