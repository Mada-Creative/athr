import React, { useLayoutEffect, useMemo } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import typography from '../theme/typography';
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
    navigation.setOptions({ title: surah?.transliteration || 'القرآن الكريم' });
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
            <View style={styles.banner}>
              <View style={styles.bannerRule} />
              <AppText style={styles.surahName}>{surah.name}</AppText>
              <View style={styles.bannerRule} />
            </View>
            <AppText size={12} color={colors.inkSoft} style={{ marginTop: spacing.sm, textAlign: 'center' }}>
              {surah.transliteration} · {TYPE_LABEL[surah.type] || surah.type} · {surah.total_verses} آية · الجزء{' '}
              {surah.verses[0].juz}
            </AppText>
            {!NO_BISMILLAH_HEADER.has(surah.id) ? (
              <AppText style={[styles.bismillah, { marginTop: spacing.lg }]}>
                بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
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
            <View style={{ flex: 1 }}>
              <AppText style={styles.verseText}>{item.text}</AppText>
              {item.sajda ? (
                <View style={styles.sajdaTag}>
                  <Ionicons name="body-outline" size={11} color={colors.clay} />
                  <AppText size={10.5} weight="semibold" color={colors.clay} style={{ marginRight: 4 }}>
                    سجدة
                  </AppText>
                </View>
              ) : null}
            </View>
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
    header: { alignItems: 'center', paddingBottom: spacing.lg, marginBottom: spacing.lg },
    // A simple framed banner (rule — name — rule) standing in for the
    // mushaf's ornamental surah header, in the same warm gold as the rest
    // of the app's accents rather than a plain list-style title.
    banner: {
      alignSelf: 'stretch',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.gold,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.amberSoft,
    },
    bannerRule: { height: 1, alignSelf: 'stretch', backgroundColor: colors.gold, opacity: 0.4, marginVertical: 6 },
    surahName: { fontFamily: typography.fontQuran, fontSize: 26, color: colors.amberDeep, textAlign: 'center' },
    bismillah: { fontFamily: typography.fontQuran, fontSize: 22, color: colors.ink, textAlign: 'center' },
    verseRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.lg },
    verseNum: {
      width: 24,
      height: 24,
      borderRadius: radius.pill,
      backgroundColor: colors.amberSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 6,
    },
    verseText: { fontFamily: typography.fontQuran, fontSize: 23, lineHeight: 46, color: colors.ink, textAlign: 'right' },
    sajdaTag: {
      flexDirection: 'row-reverse',
      alignSelf: 'flex-end',
      alignItems: 'center',
      backgroundColor: colors.claySoft,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      marginTop: 4,
    },
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
