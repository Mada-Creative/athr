import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import useDoneAnim from '../hooks/useDoneAnim';
import AppText from './AppText';
import Bounce from './Bounce';
import PopIcon from './PopIcon';

export default function CheckRow({ title, subtitle, checked, onToggle, onLongPress, locked, icon = 'moon-outline' }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const doneAnim = useDoneAnim(checked);
  const iconWrapBg = doneAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.backgroundAlt, colors.sage] });

  return (
    <Bounce
      disabled={locked}
      onPress={locked ? undefined : onToggle}
      onLongPress={locked ? undefined : onLongPress}
      style={[styles.row, checked && styles.rowChecked]}
    >
      <Animated.View style={[styles.iconWrap, { backgroundColor: iconWrapBg }]}>
        <PopIcon
          name={locked ? 'lock-closed-outline' : checked ? 'checkmark' : icon}
          size={18}
          color={checked ? colors.white : colors.inkSoft}
        />
      </Animated.View>
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
    </Bounce>
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
    texts: { flex: 1 },
  });
}
