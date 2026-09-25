import React, { useCallback, useState } from 'react';
import { Animated, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import Card from '../components/Card';
import Bounce from '../components/Bounce';
import { useTheme } from '../context/ThemeContext';
import { useTabBarScroll } from '../context/TabBarScrollContext';
import { radius, spacing } from '../theme/spacing';
import typography from '../theme/typography';
import { api } from '../api/client';

// A handful of the most commonly-repeated dhikr — tapping one starts (or
// resumes) its counter straight away. Anything not on this list can be
// typed in and added as a custom counter below.
const PRESETS = ['سبحان الله', 'الحمد لله', 'الله أكبر', 'لا إله إلا الله', 'أستغفر الله', 'لا حول ولا قوة إلا بالله', 'سبحان الله وبحمده'];

export default function TasbihScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const registerScroll = useTabBarScroll();
  const [counters, setCounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customText, setCustomText] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/tasbih');
      setCounters(res.counters);
    } catch (err) {
      // keep whatever was already loaded
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const existingTexts = new Set(counters.map((c) => c.text));
  const openCounter = (counter) => navigation.navigate('TasbihCounter', { id: counter._id, text: counter.text });

  const onPickPreset = async (text) => {
    setError(null);
    const existing = counters.find((c) => c.text === text);
    if (existing) {
      openCounter(existing);
      return;
    }
    try {
      const res = await api.post('/tasbih', { text });
      setCounters((prev) => [res.counter, ...prev]);
      openCounter(res.counter);
    } catch (err) {
      // couldn't create — leave the preset tappable for another try
      setError(err.message || 'تعذر إنشاء العدّاد — تحقق من اتصالك بالإنترنت');
    }
  };

  const onAddCustom = async () => {
    const text = customText.trim();
    if (!text) return;
    setAdding(true);
    setError(null);
    try {
      const res = await api.post('/tasbih', { text });
      setCounters((prev) => (existingTexts.has(text) ? prev : [res.counter, ...prev]));
      setCustomText('');
      openCounter(res.counter);
    } catch (err) {
      // leave the input as-is so the user can retry
      setError(err.message || 'تعذر إضافة الذكر — تحقق من اتصالك بالإنترنت');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Screen scroll={false} contentStyle={{ flex: 1 }}>
      <Animated.FlatList
        data={counters}
        keyExtractor={(item) => item._id}
        keyboardShouldPersistTaps="handled"
        onScroll={registerScroll(route.name)}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: spacing.xxl * 3 }}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <View style={styles.headerIconWrap}>
                <Ionicons name="sparkles-outline" size={19} color={colors.amberDeep} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText weight="bold" size={20}>
                  العدّاد
                </AppText>
                <AppText size={13} color={colors.inkSoft} style={{ marginTop: 2 }}>
                  اختر ذكرًا لتبدأ عدّه، أو أضف ذكرًا خاصًا بك
                </AppText>
              </View>
            </View>

            <View style={styles.sectionLabelRow}>
              <Ionicons name="flash-outline" size={13} color={colors.inkFaint} />
              <AppText size={12} weight="semibold" color={colors.inkFaint}>
                مختارات سريعة
              </AppText>
            </View>

            <View style={styles.presetsRow}>
              {PRESETS.map((text) => {
                const existing = counters.find((c) => c.text === text);
                return (
                  <Bounce key={text} style={styles.presetChip} onPress={() => onPickPreset(text)}>
                    <AppText size={14} color={colors.ink} style={styles.dhikrText}>
                      {text}
                    </AppText>
                    {/* Surfaces progress already made on a preset right where you'd
                        tap to resume it, instead of only in the list further down —
                        a fresh, never-started preset shows no badge at all. */}
                    {existing?.count > 0 ? (
                      <View style={styles.presetBadge}>
                        <AppText size={11} weight="bold" color={colors.amberDeep}>
                          {existing.count}
                        </AppText>
                      </View>
                    ) : null}
                  </Bounce>
                );
              })}
            </View>

            <View style={styles.customRow}>
              <TextInput
                value={customText}
                onChangeText={setCustomText}
                placeholder="اكتب ذكرًا آخر…"
                placeholderTextColor={colors.inkFaint}
                style={styles.customInput}
                textAlign="right"
                onSubmitEditing={onAddCustom}
                returnKeyType="done"
              />
              <Bounce
                style={[styles.addBtn, (!customText.trim() || adding) && { opacity: 0.5 }]}
                onPress={onAddCustom}
                disabled={!customText.trim() || adding}
              >
                <Ionicons name="add" size={22} color={colors.white} />
              </Bounce>
            </View>

            {error ? (
              <AppText size={12} color={colors.clay} style={{ marginTop: spacing.sm }}>
                {error}
              </AppText>
            ) : null}

            {counters.length > 0 && (
              <View style={[styles.sectionLabelRow, { marginTop: spacing.xl }]}>
                <Ionicons name="list-outline" size={13} color={colors.inkFaint} />
                <AppText size={12} weight="semibold" color={colors.inkFaint}>
                  عدّاداتك
                </AppText>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Bounce scaleTo={0.97} onPress={() => openCounter(item)}>
            <Card style={styles.counterCard}>
              <View style={styles.counterIconWrap}>
                <Ionicons name="ellipse-outline" size={16} color={colors.amberDeep} />
              </View>
              <AppText size={16} style={[styles.dhikrText, { flex: 1 }]}>
                {item.text}
              </AppText>
              <View style={styles.countBadge}>
                <AppText weight="bold" size={14} color={colors.amberDeep}>
                  {item.count}
                </AppText>
              </View>
            </Card>
          </Bounce>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="add-circle-outline" size={28} color={colors.inkFaint} />
              <AppText size={13} color={colors.inkFaint} style={{ textAlign: 'center', marginTop: spacing.sm }}>
                لا يوجد عدّادات بعد — اختر ذكرًا من الأعلى لتبدأ
              </AppText>
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    dhikrText: { fontFamily: typography.fontDhikr },
    headerRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    headerIconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      backgroundColor: colors.amberSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionLabelRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 5,
      marginBottom: spacing.sm,
    },
    presetsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm },
    presetChip: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.pill,
      backgroundColor: colors.amberSoft,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 1,
    },
    presetBadge: {
      minWidth: 20,
      height: 20,
      paddingHorizontal: 5,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    customRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
    customInput: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md - 4,
      fontSize: 14,
      color: colors.ink,
    },
    addBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      backgroundColor: colors.accentDark,
      alignItems: 'center',
      justifyContent: 'center',
    },
    counterCard: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: spacing.sm,
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    counterIconWrap: {
      width: 30,
      height: 30,
      borderRadius: radius.pill,
      backgroundColor: colors.amberSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countBadge: {
      minWidth: 40,
      height: 32,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.amberSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
  });
}
