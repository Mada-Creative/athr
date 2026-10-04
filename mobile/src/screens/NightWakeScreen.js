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
import { nightWakeDua } from '../constants/duas';

// Reached only from Home's "تعارّيت من الليل؟" tile, which itself only
// shows up during the last third of the night (see HomeScreen) — so by the
// time someone lands here, the "when" question is already answered, this
// screen is just the "what to do" for a couple of minutes.
export default function NightWakeScreen({ navigation }) {
  const { colors } = useTheme();

  return (
    <Screen>
      <AppText color={colors.inkSoft} size={13.5} style={{ marginBottom: spacing.lg }}>
        صحيت بهالوقت المبارك؟ خذ لحظة قبل ما ترجع تنام
      </AppText>

      <Card>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.pill,
              backgroundColor: colors.amberSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="moon-outline" size={17} color={colors.amberDeep} />
          </View>
          <AppText weight="bold" size={15}>
            {nightWakeDua.title}
          </AppText>
        </View>
        <AppText
          size={16}
          color={colors.ink}
          style={{ marginTop: spacing.md, lineHeight: 27, fontFamily: typography.fontDhikr, textAlign: 'right' }}
        >
          {nightWakeDua.text}
        </AppText>
        <AppText size={11.5} color={colors.inkSoft} style={{ marginTop: spacing.sm, textAlign: 'right' }}>
          {nightWakeDua.source}
        </AppText>
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.pill,
              backgroundColor: colors.sageSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="sparkles-outline" size={17} color={colors.sage} />
          </View>
          <AppText weight="bold" size={15}>
            قيام الليل
          </AppText>
        </View>
        <AppText size={13.5} color={colors.inkSoft} style={{ marginTop: spacing.sm, lineHeight: 22 }}>
          ولو ركعتين بس — قيام الليل من أعظم الأعمال، وأقرب ما يكون الرب من عبده في جوف الليل الآخر
        </AppText>
        <Bounce
          onPress={() => navigation.navigate('Tracker')}
          style={{
            flexDirection: 'row-reverse',
            alignItems: 'center',
            alignSelf: 'flex-start',
            marginTop: spacing.md,
            backgroundColor: colors.sageSoft,
            borderRadius: radius.pill,
            paddingHorizontal: spacing.md,
            paddingVertical: 7,
          }}
        >
          <Ionicons name="chevron-back" size={15} color={colors.sage} />
          <AppText weight="semibold" size={13} color={colors.sage} style={{ marginRight: 6 }}>
            علّم قيام الليل من المتابعة
          </AppText>
        </Bounce>
      </Card>
    </Screen>
  );
}
