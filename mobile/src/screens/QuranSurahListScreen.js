import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import typography from '../theme/typography';
import quranSurahs from '../constants/quranText.json';

const TYPE_LABEL = { meccan: 'مكية', medinan: 'مدنية' };

// The full mushaf — official King Fahd Complex Uthmani (Hafs) text,
// bundled with the app so it opens instantly and works offline like
// everything else, no network round-trip just to read a page.
export default function QuranSurahListScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return quranSurahs;
    return quranSurahs.filter(
      (s) => s.name.includes(query.trim()) || s.transliteration.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <Screen scroll={false} contentStyle={{ flex: 1 }}>
      <AppText weight="bold" size={22} style={{ marginBottom: 4 }}>
        القرآن الكريم
      </AppText>
      <AppText color={colors.inkSoft} size={13.5} style={{ marginBottom: spacing.md }}>
        114 سورة — اختر سورة لبدء القراءة
      </AppText>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={16} color={colors.inkFaint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="ابحث عن اسم سورة..."
          placeholderTextColor={colors.inkFaint}
          style={styles.searchInput}
          textAlign="right"
        />
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <AppText color={colors.inkSoft} size={13} style={{ textAlign: 'center', marginTop: spacing.xl }}>
            لا توجد نتائج
          </AppText>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('QuranReader', { surahId: item.id })}
          >
            <View style={styles.numBadge}>
              <AppText size={12.5} weight="bold" color={colors.amberDeep}>
                {item.id}
              </AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={styles.surahName}>{item.name}</AppText>
              <AppText size={11.5} color={colors.inkSoft} style={{ marginTop: 3 }}>
                {item.transliteration} · {TYPE_LABEL[item.type] || item.type} · {item.total_verses} آية
              </AppText>
            </View>
            <Ionicons name="chevron-back" size={16} color={colors.inkSoft} />
          </TouchableOpacity>
        )}
      />
    </Screen>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    searchBox: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.md,
    },
    searchInput: { flex: 1, paddingVertical: spacing.sm + 2, fontSize: 14, color: colors.ink },
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
    numBadge: {
      width: 34,
      height: 34,
      borderRadius: radius.pill,
      backgroundColor: colors.amberSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // The mushaf's own calligraphic name, not the app's UI font — reads
    // like an actual surah heading rather than a generic list label.
    surahName: { fontFamily: typography.fontQuran, fontSize: 21, color: colors.ink, textAlign: 'right' },
  });
}
