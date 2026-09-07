import React, { useLayoutEffect, useMemo } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import quranSurahs from '../constants/quranText.json';

const TYPE_LABEL = { meccan: 'مكية', medinan: 'مدنية' };
// Verse 1 of Al-Fatihah already *is* the Bismillah in the data, and
// At-Tawbah is the one surah the mushaf never opens with it — everywhere
// else it's the traditional un-numbered heading rendered above verse 1.
const NO_BISMILLAH_HEADER = new Set([1, 9]);

export default function QuranReaderScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const surahId = route.params?.surahId;
  const surah = useMemo(() => quranSurahs.find((s) => s.id === surahId), [surahId]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: surah?.name || 'القرآن الكريم' });
  }, [navigation, surah]);

  const goTo = (id) => {
    if (id < 1 || id > quranSurahs.length) return;
    navigation.setParams({ surahId: id });
  };

  if (!surah) {
    return (
      <Screen>
        <AppText color={colors.inkSoft}>تعذر تحميل هذه السورة</AppText>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} contentStyle={{ flex: 1 }}>
      <FlatList
        data={surah.verses}
        keyExtractor={(v) => String(v.id)}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText weight="bold" size={24} style={{ textAlign: 'center' }}>
              {surah.name}
            </AppText>
            <AppText size={12.5} color={colors.inkSoft} style={{ marginTop: 4, textAlign: 'center' }}>
              {surah.transliteration} · {TYPE_LABEL[surah.type] || surah.type} · {surah.total_verses} آية
            </AppText>
            {!NO_BISMILLAH_HEADER.has(surah.id) ? (
              <AppText weight="bold" size={19} style={{ marginTop: spacing.lg, textAlign: 'center' }}>
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </AppText>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.verseRow}>
            <View style={styles.verseNum}>
              <AppText size={10} weight="bold" color={colors.amberDeep}>
                {item.id}
              </AppText>
            </View>
            <AppText size={20} style={styles.verseText}>
              {item.text}
            </AppText>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.navRow}>
            <TouchableOpacity
              disabled={surah.id <= 1}
              onPress={() => goTo(surah.id - 1)}
              style={[styles.navBtn, surah.id <= 1 && styles.navBtnDisabled]}
            >
              <Ionicons name="chevron-forward" size={16} color={colors.ink} />
              <AppText size={12.5} weight="semibold" style={{ marginRight: 4 }}>
                السابقة
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={surah.id >= quranSurahs.length}
              onPress={() => goTo(surah.id + 1)}
              style={[styles.navBtn, surah.id >= quranSurahs.length && styles.navBtnDisabled]}
            >
              <AppText size={12.5} weight="semibold" style={{ marginLeft: 4 }}>
                التالية
              </AppText>
              <Ionicons name="chevron-back" size={16} color={colors.ink} />
            </TouchableOpacity>
          </View>
        }
      />
    </Screen>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    header: {
      alignItems: 'center',
      paddingBottom: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: spacing.lg,
    },
    verseRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.lg },
    verseNum: {
      width: 22,
      height: 22,
      borderRadius: radius.pill,
      backgroundColor: colors.amberSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    verseText: { flex: 1, lineHeight: 38, textAlign: 'right' },
    navRow: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      marginTop: spacing.xl,
      paddingTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    navBtn: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
    },
    navBtnDisabled: { opacity: 0.35 },
  });
}
