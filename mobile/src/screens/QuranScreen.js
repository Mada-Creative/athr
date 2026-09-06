import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import { api } from '../api/client';
import { todayISO } from '../utils/date';

export default function QuranScreen() {
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

      <Card style={styles.card}>
        <View style={[styles.iconWrap, log?.completed && styles.iconWrapDone]}>
          <Ionicons name={log?.completed ? 'checkmark' : 'book-outline'} size={26} color={log?.completed ? colors.white : colors.amberDeep} />
        </View>
        <AppText weight="semibold" size={16} style={{ marginTop: spacing.md }}>
          {log?.completed ? 'أتممت وردك اليوم، بارك الله فيك' : 'هل قرأت وردك اليوم؟'}
        </AppText>
        <PrimaryButton
          title={log?.completed ? 'إلغاء التحديد' : 'تم القراءة'}
          onPress={toggleCompleted}
          variant={log?.completed ? 'outline' : 'solid'}
          style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
        />
      </Card>

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
    card: { alignItems: 'center' },
    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: radius.pill,
      backgroundColor: colors.amberSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapDone: { backgroundColor: colors.sage },
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
