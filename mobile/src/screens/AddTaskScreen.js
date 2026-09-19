import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import PrimaryButton from '../components/PrimaryButton';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import { api } from '../api/client';
import { todayISO } from '../utils/date';
import useDailyData from '../hooks/useDailyData';

// Doubles as both "add" and "edit" — route.params.taskId (present only when
// opened by long-pressing an existing row on the Tracker screen) switches
// it into edit mode: fields pre-filled, save calls editTask instead of
// creating a new one, and a delete option appears below it. Deliberately no
// trash-can icon anywhere here — this list can hold a dhikr or a dua
// someone typed in themselves, and a bin icon next to it reads as
// dismissive of that; a plain worded text button does the same job.
export default function AddTaskScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { group, taskId } = route.params;
  const date = todayISO();
  const { dailyDeedTasks, otherTasks, editTask, deleteTask } = useDailyData(date);

  const isDailyDeeds = group === 'dailyDeeds';
  const isEditing = Boolean(taskId);
  const existingTask = isEditing
    ? (isDailyDeeds ? dailyDeedTasks : otherTasks).find((t) => t._id === taskId)
    : null;

  const [title, setTitle] = useState(existingTask?.title ?? '');
  const [description, setDescription] = useState(existingTask?.description ?? '');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const onSave = async () => {
    if (!title.trim()) {
      setError('الرجاء إدخال عنوان');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isEditing) {
        await editTask(taskId, { title: title.trim(), description });
      } else {
        await api.post('/tasks', { group, title, description });
      }
      navigation.goBack();
    } catch (err) {
      setError(err.message || 'تعذر الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = () => {
    Alert.alert('حذف هذا العنصر؟', 'يمكنك إضافته من جديد لاحقًا إذا احتجته.', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          setError(null);
          try {
            await deleteTask(taskId);
            navigation.goBack();
          } catch (err) {
            setError(err.message || 'تعذر الحذف');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <AppText weight="bold" size={20}>
        {isEditing ? 'تعديل العنصر' : isDailyDeeds ? 'إضافة عبادة يومية' : 'إضافة عنصر جديد'}
      </AppText>
      <AppText color={colors.inkSoft} size={13} style={{ marginTop: 4, marginBottom: spacing.xl }}>
        {isEditing
          ? 'صحّح العنوان أو الوصف إذا وقع خطأ عند الإضافة'
          : isDailyDeeds
          ? 'مثل: صيام الاثنين والخميس، صلة الرحم'
          : 'أضف أي عادة أو عمل تريد متابعته'}
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

      {isEditing ? (
        <TouchableOpacity onPress={onDelete} disabled={deleting} style={styles.deleteBtn}>
          <AppText weight="semibold" size={14} color={colors.clay}>
            {deleting ? 'جارٍ الحذف…' : 'حذف هذا العنصر'}
          </AppText>
        </TouchableOpacity>
      ) : null}
    </Screen>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
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
    deleteBtn: {
      alignItems: 'center',
      marginTop: spacing.xl,
      paddingVertical: spacing.sm,
    },
  });
}
