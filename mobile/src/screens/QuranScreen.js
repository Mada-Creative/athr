import React, { useCallback, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import Card from '../components/Card';
import Bounce from '../components/Bounce';
import PrimaryButton from '../components/PrimaryButton';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import { api } from '../api/client';
import { todayISO } from '../utils/date';

export default function QuranScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const date = todayISO();
  const [log, setLog] = useState(null);
  const [pages, setPages] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/quran/${date}`);
      setLog(res.log);
      setPages(res.log?.pagesRead ? String(res.log.pagesRead) : '');
    } catch (err) {
      // leave defaults
    } finally {
      setLoading(false);
    }
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggleCompleted = async () => {
    const next = !log?.completed;
    setLog((prev) => ({ ...prev, completed: next }));
    try {
      const res = await api.patch(`/quran/${date}`, { completed: next });
      setLog(res.log);
    } catch (err) {
      setLog((prev) => ({ ...prev, completed: !next }));
    }
  };

  const savePages = async () => {
    const value = parseInt(pages, 10) || 0;
    try {
      const res = await api.patch(`/quran/${date}`, { pagesRead: value });
      setLog(res.log);
    } catch (err) {
      // ignore
    }
  };

  return (
    <Screen>
      <AppText weight="bold" size={22}>
        وِرد القرآن الكريم
      </AppText>
      <AppText color={colors.inkSoft} size={13.5} style={{ marginTop: 4, marginBottom: spacing.lg }}>
        وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا
      </AppText>

      <Card style={styles.heroCard}>
        <View style={[styles.heroIconWrap, { backgroundColor: log?.completed ? colors.sage : colors.gold }]}>
          <Ionicons
            name={log?.completed ? 'checkmark' : 'book-outline'}
            size={28}
            color={log?.completed ? colors.white : colors.accentDark}
          />
        </View>
        <AppText weight="bold" size={16.5} color={colors.white} style={{ marginTop: spacing.md, textAlign: 'center' }}>
          {log?.completed ? 'أتممت وردك اليوم، بارك الله فيك' : 'هل قرأت وردك اليوم؟'}
        </AppText>
        <AppText size={12} color={colors.accentSoft} style={{ marginTop: 4, textAlign: 'center' }}>
          احرص على ورد يومي ولو آيات يسيرة
        </AppText>
        <PrimaryButton
          title={log?.completed ? 'إلغاء التحديد' : 'تم القراءة'}
          onPress={toggleCompleted}
          variant={log?.completed ? 'outlineInverted' : 'inverted'}
          style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
        />
      </Card>

      <Bounce scaleTo={0.98} onPress={() => navigation.navigate('QuranSurahList')} style={styles.readCta}>
        <View style={styles.readCtaIcon}>
          <Ionicons name="book" size={22} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText weight="bold" size={15} color={colors.white}>
            اقرأ القرآن الكريم
          </AppText>
          <AppText size={11.5} color="rgba(255,255,255,0.85)" style={{ marginTop: 2 }}>
            تصفّح السور الـ 114 وابدأ القراءة الآن
          </AppText>
        </View>
        <Ionicons name="chevron-back" size={18} color={colors.white} />
      </Bounce>

      <Card style={{ marginTop: spacing.lg }}>
        <AppText weight="semibold" size={14} style={{ marginBottom: spacing.sm }}>
          عدد الصفحات المقروءة (اختياري)
        </AppText>
        <View style={styles.pagesRow}>
          <TextInput
            value={pages}
            onChangeText={setPages}
            keyboardType="number-pad"
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.inkFaint}
            textAlign="center"
            onBlur={savePages}
          />
          <AppText size={13} color={colors.inkSoft}>
            صفحة
          </AppText>
        </View>
      </Card>
    </Screen>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    heroCard: {
      alignItems: 'center',
      // Fixed dark ink surface — deliberately doesn't invert with the
      // theme, same family as Home's hero card.
      backgroundColor: colors.accentDark,
      borderColor: colors.accentDark,
    },
    heroIconWrap: {
      width: 64,
      height: 64,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // A distinct green accent (as opposed to the app's usual ink/amber) so
    // this reads as its own standout feature, not just another list row.
    readCta: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.sage,
      borderRadius: radius.md,
      padding: spacing.lg,
      marginTop: spacing.lg,
    },
    readCtaIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pagesRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.md },
    input: {
      width: 90,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingVertical: spacing.sm,
      fontSize: 16,
      color: colors.ink,
    },
  });
}
