import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import typography from '../theme/typography';
import { QURAN_PAGES, TOTAL_PAGES, NO_BISMILLAH_HEADER, pageForSurah, toArabicIndicDigits } from '../utils/quranPages';

const BISMILLAH = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';

function resolvePage(params) {
  if (params?.page) return params.page;
  if (params?.surahId) return pageForSurah(params.surahId);
  return 1;
}

// A real mushaf page, not a per-ayah card list — the same 604-page Madani
// pagination the bundled text already carries per verse (see
// utils/quranPages.js), with verses flowing together as continuous text
// and a surah's own ornamental banner + Bismillah breaking the flow
// wherever one actually starts on the page (sometimes more than once, for
// very short surahs back to back). Line breaks within a page follow this
// device's own text wrapping, not a specific print's exact layout — there's
// no per-line position data to match that, only the page number itself.
export default function QuranReaderScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [pageNumber, setPageNumber] = useState(() => resolvePage(route.params));

  // Reacts to a fresh `{ surahId }`/`{ page }` arriving on an already-mounted
  // instance of this screen (e.g. native-stack reusing it when navigated to
  // again rather than pushing a new one) — same reactivity the old
  // per-surah version had via its own useMemo keyed on route.params.surahId.
  useEffect(() => {
    setPageNumber(resolvePage(route.params));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.surahId, route.params?.page]);

  const page = QURAN_PAGES[pageNumber - 1];

  useLayoutEffect(() => {
    navigation.setOptions({
      title: page ? `صفحة ${toArabicIndicDigits(pageNumber)} · الجزء ${toArabicIndicDigits(page.juz)}` : 'القرآن الكريم',
    });
  }, [navigation, pageNumber, page]);

  const goTo = (n) => {
    if (n < 1 || n > TOTAL_PAGES) return;
    setPageNumber(n);
  };

  if (!page) {
    return (
      <Screen>
        <AppText color={colors.inkSoft}>تعذر تحميل هذه الصفحة</AppText>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} contentStyle={{ flex: 1 }}>
      <ScrollView
        key={pageNumber}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {page.blocks.map((block, i) =>
          block.type === 'surah-start' ? (
            <View key={`surah-${block.surah.id}-${i}`} style={styles.banner}>
              <View style={styles.bannerRule} />
              <AppText style={styles.surahName}>{block.surah.name}</AppText>
              <View style={styles.bannerRule} />
              {!NO_BISMILLAH_HEADER.has(block.surah.id) ? (
                <AppText style={[styles.bismillah, { marginTop: spacing.md }]}>{BISMILLAH}</AppText>
              ) : null}
            </View>
          ) : (
            // Plain RN `Text` for every nested span below — not another
            // `AppText`, which always applies its own default font/size
            // (Cairo, the UI font) to whatever doesn't get an explicit
            // `style` prop. Nesting those inside this AppText silently
            // overrode the inherited Quran font/size on every single verse,
            // which is exactly the bug the first version of this screen
            // shipped with: real Quran text rendered in the wrong typeface.
            // Plain `Text` has no default style of its own, so it actually
            // inherits fontFamily/fontSize/color/textAlign from this
            // AppText's own underlying Text node, the way nested RN Text
            // is supposed to work.
            <AppText key={`verses-${block.surah.id}-${i}`} style={styles.pageText}>
              {block.verses.map((v) => (
                <Text key={v.id}>
                  {v.text}
                  <Text style={styles.ayahMarker}>{` ﴿${toArabicIndicDigits(v.id)}﴾ `}</Text>
                  {v.sajda ? <Text style={styles.sajdaMark}>۩ </Text> : null}
                </Text>
              ))}
            </AppText>
          )
        )}

        <View style={styles.navRow}>
          <TouchableOpacity
            disabled={pageNumber <= 1}
            onPress={() => goTo(pageNumber - 1)}
            style={[styles.navBtn, pageNumber <= 1 && styles.navBtnDisabled]}
          >
            <Ionicons name="chevron-forward" size={16} color={colors.ink} />
            <AppText size={12.5} weight="semibold" style={{ marginRight: 4 }}>
              الصفحة السابقة
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={pageNumber >= TOTAL_PAGES}
            onPress={() => goTo(pageNumber + 1)}
            style={[styles.navBtn, pageNumber >= TOTAL_PAGES && styles.navBtnDisabled]}
          >
            <AppText size={12.5} weight="semibold" style={{ marginLeft: 4 }}>
              الصفحة التالية
            </AppText>
            <Ionicons name="chevron-back" size={16} color={colors.ink} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
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
      marginBottom: spacing.lg,
    },
    bannerRule: { height: 1, alignSelf: 'stretch', backgroundColor: colors.gold, opacity: 0.4, marginVertical: 6 },
    surahName: { fontFamily: typography.fontQuran, fontSize: 24, color: colors.amberDeep, textAlign: 'center' },
    bismillah: { fontFamily: typography.fontQuran, fontSize: 20, color: colors.ink, textAlign: 'center' },
    // Plain right alignment, not 'justify' — justify's stretched inter-word
    // spacing has a real bug with Arabic text on both platforms' text
    // engines: it can split a word's trailing connected letter (tanween's
    // alif in particular — "مَرَضًا" rendering as "مَرَضَ" then a stray "ا"
    // floating on its own) onto the wrong line entirely. A normal ragged
    // left edge is how every other Arabic reading app (including the old
    // per-ayah-card version of this screen) renders body text, for exactly
    // this reason.
    pageText: {
      fontFamily: typography.fontQuran,
      fontSize: 22,
      lineHeight: 46,
      color: colors.ink,
      textAlign: 'right',
      writingDirection: 'rtl',
      marginBottom: spacing.lg,
    },
    ayahMarker: { fontSize: 16, color: colors.amberDeep },
    sajdaMark: { fontSize: 16, color: colors.clay },
    navRow: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      marginTop: spacing.md,
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
