import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import typography from '../theme/typography';

const WEIGHT_FONTS = {
  regular: typography.fontRegular,
  medium: typography.fontMedium,
  semibold: typography.fontSemiBold,
  bold: typography.fontBold,
};

export default function AppText({ weight = 'regular', size = typography.body, color, style, ...rest }) {
  const { colors } = useTheme();
  return (
    <Text
      style={[{ fontFamily: WEIGHT_FONTS[weight], fontSize: size, color: color ?? colors.ink, textAlign: 'right' }, style]}
      {...rest}
    />
  );
}
