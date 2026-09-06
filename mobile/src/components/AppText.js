import React from 'react';
import { Text } from 'react-native';
import colors from '../theme/colors';
import typography from '../theme/typography';

const WEIGHT_FONTS = {
  regular: typography.fontRegular,
  medium: typography.fontMedium,
  semibold: typography.fontSemiBold,
  bold: typography.fontBold,
};

export default function AppText({ weight = 'regular', size = typography.body, color = colors.ink, style, ...rest }) {
  return (
    <Text
      style={[{ fontFamily: WEIGHT_FONTS[weight], fontSize: size, color, textAlign: 'right' }, style]}
      {...rest}
    />
  );
}
