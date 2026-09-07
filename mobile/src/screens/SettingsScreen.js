import React, { useState } from 'react';
import { StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

// Fixed and not user-editable — the same split the backend always scores
// against (see backend/src/controllers/statsController.js). Shown here only
// so people understand how "بصمتك اليوم" is computed, nothing more.
const SCORE_BREAKDOWN = [
  { label: 'الصلوات', percent: 50 },
  { label: 'الأذكار', percent: 10 },
  { label: 'القرآن', percent: 10 },
  { label: 'النوافل', percent: 10 },
  { label: 'عبادات يومية', percent: 10 },
  { label: 'أخرى', percent: 10 },
];

// Graduated presets, shortest to longest — matches how far ahead someone
// actually plans to stop what they're doing for a prayer.
const REMINDER_OPTIONS = [
  { value: null, label: 'بدون' },
  { value: 5, label: '5 دقائق' },
  { value: 10, label: '10 دقائق' },
  { value: 15, label: '15 دقيقة' },
  { value: 30, label: '30 دقيقة' },
  { value: 60, label: 'ساعة' },
];

const THEME_OPTIONS = [
  { value: 'light', label: 'فاتح', icon: 'sunny-outline' },
  { value: 'dark', label: 'داكن', icon: 'moon-outline' },
  { value: 'system', label: 'تلقائي', icon: 'phone-portrait-outline' },
];

export default function SettingsScreen() {
  const { colors, preference, setPreference } = useTheme();
  const styles = createStyles(colors);
  const { user, isGuest, updateUser, logout } = useAuth();
  const [atAdhan, setAtAdhan] = useState(user?.prayerNotifications?.atAdhan ?? false);
  const [reminderMinutes, setReminderMinutes] = useState(user?.prayerNotifications?.reminderMinutes ?? null);
  const [gender, setGender] = useState(user?.gender ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const onSave = async () => {
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const res = await api.put('/auth/settings', {
        gender,
        prayerNotifications: { atAdhan, reminderMinutes },
      });
      updateUser(res.user);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'تعذر حفظ الإعدادات — تحقق من اتصالك بالإنترنت وحاول مجددًا');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <AppText weight="bold" size={22}>
        الإعدادات
      </AppText>

      <AppText weight="bold" size={16} style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
        مظهر التطبيق
      </AppText>
      <View style={styles.themeRow}>
        {THEME_OPTIONS.map((opt) => {
          const active = preference === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.themeOption, active && styles.themeOptionActive]}
              onPress={() => setPreference(opt.value)}
            >
              <Ionicons name={opt.icon} size={20} color={active ? colors.white : colors.ink} />
              <AppText
                size={12.5}
                weight="semibold"
                color={active ? colors.white : colors.ink}
                style={{ marginTop: 4 }}
              >
                {opt.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      <AppText weight="bold" size={16} style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
        الجنس (اختياري)
      </AppText>
      <AppText size={12} color={colors.inkSoft} style={{ marginBottom: spacing.sm }}>
        يُستخدم فقط لإظهار خيار "العذر الشرعي" في صفحة المتابعة
      </AppText>
      <View style={styles.chipsRow}>
        {[
          { value: 'female', label: 'أنثى' },
          { value: 'male', label: 'ذكر' },
        ].map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, gender === opt.value && styles.chipActive]}
            onPress={() => setGender(gender === opt.value ? null : opt.value)}
          >
            <AppText size={12.5} weight="semibold" color={gender === opt.value ? colors.white : colors.ink}>
              {opt.label}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      <AppText weight="bold" size={16} style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
        كيف يُحسب إنجازك اليومي؟
      </AppText>
      <AppText size={12} color={colors.inkSoft} style={{ marginBottom: spacing.sm }}>
        نسبة ثابتة للجميع — الصلوات أساس اليوم، وكل ما عداها يكمّلها بالتساوي
      </AppText>
      <Card style={styles.breakdownCard}>
        {SCORE_BREAKDOWN.map((row) => (
          <View key={row.label} style={styles.breakdownRow}>
            <AppText size={14}>{row.label}</AppText>
            <AppText size={14} weight="semibold" color={colors.inkSoft}>
              {row.percent}%
            </AppText>
          </View>
        ))}
      </Card>

      <AppText weight="bold" size={16} style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
        تنبيهات الصلاة
      </AppText>
      <Card>
        <View style={styles.notifRow}>
          <Switch value={atAdhan} onValueChange={setAtAdhan} trackColor={{ true: colors.amber }} />
          <View style={{ flex: 1 }}>
            <AppText size={14} weight="semibold">
              تنبيه في وقت الأذان
            </AppText>
            <AppText size={11.5} color={colors.inkSoft} style={{ marginTop: 2 }}>
              إشعار فور دخول وقت كل صلاة
            </AppText>
          </View>
        </View>

        <View style={styles.divider} />

        <AppText size={14} weight="semibold" style={{ marginBottom: spacing.sm }}>
          تذكير قبل الصلاة
        </AppText>
        <View style={styles.chipsRow}>
          {REMINDER_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={String(opt.value)}
              style={[styles.chip, reminderMinutes === opt.value && styles.chipActive]}
              onPress={() => setReminderMinutes(opt.value)}
            >
              <AppText size={12.5} weight="semibold" color={reminderMinutes === opt.value ? colors.white : colors.ink}>
                {opt.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {error ? (
        <AppText color={colors.clay} size={13} style={{ marginTop: spacing.md }}>
          {error}
        </AppText>
      ) : null}
      {success ? (
        <AppText color={colors.sage} size={13} style={{ marginTop: spacing.md }}>
          تم حفظ الإعدادات بنجاح
        </AppText>
      ) : null}

      <PrimaryButton title="حفظ الإعدادات" onPress={onSave} loading={saving} style={{ marginTop: spacing.lg }} />
      {!isGuest ? (
        <PrimaryButton title="تسجيل الخروج" onPress={logout} variant="outline" style={{ marginTop: spacing.md }} />
      ) : null}
    </Screen>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    themeRow: { flexDirection: 'row-reverse', gap: spacing.sm },
    themeOption: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    // Fixed dark surface (like a solid button) — never inverts with the
    // theme, so the white icon/label on it never washes out in dark mode.
    themeOptionActive: { backgroundColor: colors.accentDark, borderColor: colors.accentDark },
    chipsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.accentDark, borderColor: colors.accentDark },
    breakdownCard: { gap: 0 },
    breakdownRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    notifRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.md },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  });
}
