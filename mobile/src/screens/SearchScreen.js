import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, InteractionManager, Keyboard, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';

const SEARCHABLE = [
  { title: 'متابعة العبادات', icon: 'checkbox-outline', route: 'Tracker' },
  { title: 'مواقيت الصلاة', icon: 'time-outline', route: 'PrayerDetail' },
  { title: 'أذكار الصباح', icon: 'partly-sunny-outline', route: 'AthkarCounter', params: { category: 'morning' } },
  { title: 'أذكار المساء', icon: 'moon-outline', route: 'AthkarCounter', params: { category: 'evening' } },
  { title: 'أذكار بعد الصلاة', icon: 'business-outline', route: 'AthkarCounter', params: { category: 'afterPrayer' } },
  { title: 'أذكار النوم', icon: 'bed-outline', route: 'AthkarCounter', params: { category: 'sleep' } },
  { title: 'أذكار الاستيقاظ', icon: 'alarm-outline', route: 'AthkarCounter', params: { category: 'wakeup' } },
  { title: 'وِرد القرآن', icon: 'book-outline', route: 'Quran' },
  { title: 'أسماء الله الحسنى', icon: 'sparkles-outline', route: 'Names' },
  { title: 'أدعية مأثورة', icon: 'hand-left-outline', route: 'Duas' },
  { title: 'اتجاه القبلة', icon: 'compass-outline', route: 'Qibla' },
  { title: 'إحصائياتي الأسبوعية', icon: 'stats-chart-outline', route: 'WeeklyStats' },
  { title: 'الإعدادات', icon: 'settings-outline', route: 'Settings' },
];

export default function SearchScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  // Focusing immediately (autoFocus) raced with this screen's own modal
  // entrance animation and could eat the very first tap on a result — wait
  // until the transition settles before opening the keyboard.
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => inputRef.current?.focus());
    return () => task.cancel();
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return SEARCHABLE;
    return SEARCHABLE.filter((item) => item.title.includes(query.trim()));
  }, [query]);

  const onSelect = (item) => {
    Keyboard.dismiss();
    navigation.navigate(item.route, item.params);
  };

  return (
    <Screen scroll={false} contentStyle={{ flex: 1 }}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.inkSoft} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="ابحث عن قسم..."
          placeholderTextColor={colors.inkFaint}
          style={styles.input}
          textAlign="right"
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.title}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: spacing.xxl }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => onSelect(item)}>
            <Ionicons name={item.icon} size={20} color={colors.amberDeep} />
            <AppText size={14.5} weight="semibold" style={{ flex: 1 }}>
              {item.title}
            </AppText>
            <Ionicons name="chevron-back" size={16} color={colors.inkSoft} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <AppText color={colors.inkSoft} size={13} style={{ textAlign: 'center', marginTop: spacing.xl }}>
            لا توجد نتائج مطابقة
          </AppText>
        }
      />
    </Screen>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
  searchBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  input: { flex: 1, fontSize: 15, color: colors.ink },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  });
}
