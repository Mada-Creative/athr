import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { useAuth } from '../context/AuthContext';

const ITEMS = [
  { title: 'وِرد القرآن', subtitle: 'تتبع قراءتك اليومية', icon: 'book-outline', route: 'Quran', color: colors.amberDeep },
  { title: 'أسماء الله الحسنى', subtitle: 'الأسماء التسعة والتسعون', icon: 'sparkles-outline', route: 'Names', color: colors.sage },
  { title: 'أدعية مأثورة', subtitle: 'من القرآن والسنة', icon: 'hand-left-outline', route: 'Duas', color: colors.clay },
  { title: 'اتجاه القبلة', subtitle: 'بوصلة تحدد اتجاه الكعبة', icon: 'compass-outline', route: 'Qibla', color: colors.ink },
  { title: 'إحصائياتي', subtitle: 'أداؤك خلال آخر 7 أيام', icon: 'stats-chart-outline', route: 'WeeklyStats', color: colors.amber },
  { title: 'الإعدادات', subtitle: 'حسابك وتفضيلاتك', icon: 'settings-outline', route: 'Settings', color: colors.inkSoft },
];

export default function MoreScreen({ navigation }) {
  const { user } = useAuth();

  return (
    <Screen>
      <AppText weight="bold" size={22}>
        المزيد
      </AppText>
      <AppText color={colors.inkSoft} size={13.5} style={{ marginTop: 4, marginBottom: spacing.xl }}>
        مرحبًا {user?.name || ''}
      </AppText>

      {ITEMS.map((item) => (
        <TouchableOpacity key={item.route} style={styles.row} onPress={() => navigation.navigate(item.route)}>
          <View style={[styles.iconWrap, { backgroundColor: `${item.color}22` }]}>
            <Ionicons name={item.icon} size={20} color={item.color} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText weight="semibold" size={14.5}>
              {item.title}
            </AppText>
            <AppText size={12} color={colors.inkSoft} style={{ marginTop: 2 }}>
              {item.subtitle}
            </AppText>
          </View>
          <Ionicons name="chevron-back" size={16} color={colors.inkSoft} />
        </TouchableOpacity>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  iconWrap: { width: 42, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
});
