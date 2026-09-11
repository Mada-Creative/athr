import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import Card from '../components/Card';
import Bounce from '../components/Bounce';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import typography from '../theme/typography';
import FRIDAY_SUNNAH from '../constants/fridaySunnah';

// Plain scrollable reference list, not a swipeable card-stack like
// DuasScreen — this is a short, fixed set meant to be read together as
// "today's list", not browsed one at a time, and there's no daily
// completion to track (no log/toggle, just reading).
export default function FridaySunnahScreen({ navigation }) {
  const { colors } = useTheme();

  return (
    <Screen>
      <AppText color={colors.inkSoft} size={13.5} style={{ marginBottom: spacing.lg }}>
        من سنن يوم الجمعة — يوم له فضل خاص عند المسلمين
      </AppText>

      {FRIDAY_SUNNAH.map((item, i) => (
        <Card key={i} style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm }}>
            <View style={[iconWrapStyle(colors)]}>
              <Ionicons name={item.icon} size={17} color={colors.sage} />
            </View>
            <AppText weight="bold" size={15}>
              {item.title}
            </AppText>
          </View>
          <AppText
            size={15}
            color={colors.ink}
            style={{ marginTop: spacing.md, lineHeight: 26, fontFamily: typography.fontDhikr, textAlign: 'right' }}
          >
            {item.text}
          </AppText>
          <AppText size={11.5} color={colors.inkSoft} style={{ marginTop: spacing.sm, textAlign: 'right' }}>
            {item.source}
          </AppText>
          {item.action ? (
            <Bounce
              onPress={() => navigation.navigate(item.action.route, item.action.params)}
              style={actionBtnStyle(colors)}
            >
              <Ionicons name="chevron-back" size={15} color={colors.sage} />
              <AppText weight="semibold" size={13} color={colors.sage} style={{ marginRight: 6 }}>
                {item.action.label}
              </AppText>
            </Bounce>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

function actionBtnStyle(colors) {
  return {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    backgroundColor: colors.sageSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  };
}

function iconWrapStyle(colors) {
  return {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.sageSoft,
    alignItems: 'center',
    justifyContent: 'center',
  };
}
