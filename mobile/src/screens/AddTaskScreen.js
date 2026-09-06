import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import PrimaryButton from '../components/PrimaryButton';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { api } from '../api/client';

export default function AddTaskScreen({ route, navigation }) {
  const { group } = route.params;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isDailyDeeds = group === 'dailyDeeds';

  const onSave = async () => {
    if (!title.trim()) {
      setError('الرجاء إدخال عنوان');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post('/tasks', { group, title, description });
      navigation.goBack();
    } catch (err) {
      setError(err.message || 'تعذر الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <AppText weight="bold" size={20}>
        {isDailyDeeds ? 'إضافة عبادة يومية' : 'إضافة عنصر جديد'}
      </AppText>
      <AppText color={colors.inkSoft} size={13} style={{ marginTop: 4, marginBottom: spacing.xl }}>
        {isDailyDeeds ? 'مثل: صيام الاثنين والخميس، صلة الرحم' : 'أضف أي عادة أو عمل تريد متابعته'}
      </AppText>

      <AppText weight="semibold" size={13} color={colors.inkSoft} style={styles.label}>
        العنوان
      </AppText>
      <TextInput value={title} onChangeText={setTitle} style={styles.input} textAlign="right" placeholder="العنوان" placeholderTextColor={colors.inkFaint} />

      <AppText weight="semibold" size={13} color={colors.inkSoft} style={styles.label}>
        وصف مختصر (اختياري)
      </AppText>
      <TextInput
        value={description}
        onChangeText={setDescription}
        style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
        textAlign="right"
        placeholder="وصف مختصر"
        placeholderTextColor={colors.inkFaint}
        multiline
      />

      {error ? (
        <AppText color={colors.clay} size={13} style={{ marginTop: spacing.sm }}>
          {error}
        </AppText>
      ) : null}

      <PrimaryButton title="حفظ" onPress={onSave} loading={loading} style={{ marginTop: spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    fontSize: 15,
    color: colors.ink,
  },
});
