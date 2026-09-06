import React, { useState } from 'react';
import { StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const WEIGHT_LABELS = {
  prayers: 'الصلوات',
  athkar: 'الأذكار',
  quran: 'القرآن',
  nawafil: 'النوافل',
  dailyDeeds: 'عبادات يومية',
  other: 'أخرى',
};

const METHODS = [
  { key: 'UmmAlQura', label: 'أم القرى' },
  { key: 'MuslimWorldLeague', label: 'رابطة العالم الإسلامي' },
  { key: 'Egyptian', label: 'الهيئة المصرية' },
  { key: 'Karachi', label: 'كراتشي' },
  { key: 'NorthAmerica', label: 'أمريكا الشمالية' },
];

export default function SettingsScreen() {
  const { user, updateUser, logout } = useAuth();
  const [weights, setWeights] = useState(() => ({ ...user?.weights }));
  const [notifications, setNotifications] = useState(user?.notificationsEnabled ?? true);
  const [method, setMethod] = useState(user?.calculationMethod || 'UmmAlQura');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const total = Object.values(weights).reduce((sum, v) => sum + Number(v || 0), 0);

  const onSave = async () => {
    setError(null);
    setSuccess(false);
    if (total !== 100) {
      setError(`مجموع النسب حاليًا ${total}%، يجب أن يكون 100%`);
      return;
    }
    setSaving(true);
    try {
      const res = await api.put('/auth/settings', {
        weights,
        notificationsEnabled: notifications,
        calculationMethod: method,
      });
      updateUser(res.user);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'تعذر حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <AppText weight="bold" size={22}>
        الإعدادات
      </AppText>

      <Card style={{ marginTop: spacing.lg }}>
        <AppText weight="semibold" size={16}>
          {user?.name}
        </AppText>
        <AppText size={13} color={colors.inkSoft} style={{ marginTop: 2 }}>
          {user?.email}
        </AppText>
      </Card>

      <AppText weight="bold" size={16} style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
        طريقة حساب مواعيد الصلاة
      </AppText>
      <View style={styles.chipsRow}>
        {METHODS.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[styles.chip, method === m.key && styles.chipActive]}
            onPress={() => setMethod(m.key)}
          >
            <AppText size={12.5} weight="semibold" color={method === m.key ? colors.white : colors.ink}>
              {m.label}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      <AppText weight="bold" size={16} style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
        كيف يُحسب إنجازك اليومي؟
      </AppText>
      <Card>
        {Object.keys(WEIGHT_LABELS).map((key) => (
          <View key={key} style={styles.weightRow}>
            <AppText size={14}>{WEIGHT_LABELS[key]}</AppText>
            <View style={styles.weightInputWrap}>
              <TextInput
                value={String(weights[key] ?? 0)}
                onChangeText={(v) => setWeights((prev) => ({ ...prev, [key]: v.replace(/[^0-9]/g, '') }))}
                keyboardType="number-pad"
                style={styles.weightInput}
                textAlign="center"
              />
              <AppText size={13} color={colors.inkSoft}>
                %
              </AppText>
            </View>
          </View>
        ))}
        <View style={styles.totalRow}>
          <AppText weight="semibold" size={13} color={total === 100 ? colors.sage : colors.clay}>
            المجموع: {total}%
          </AppText>
        </View>
      </Card>

      <View style={styles.notifRow}>
        <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: colors.amber }} />
        <AppText size={14} weight="semibold">
          تنبيهات مواعيد الصلاة والأذكار
        </AppText>
      </View>

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
      <PrimaryButton title="تسجيل الخروج" onPress={logout} variant="outline" style={{ marginTop: spacing.md }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  weightRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  weightInputWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  weightInput: {
    width: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 4,
    fontSize: 14,
    color: colors.ink,
  },
  totalRow: { paddingTop: spacing.sm, alignItems: 'flex-end' },
  notifRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
});
