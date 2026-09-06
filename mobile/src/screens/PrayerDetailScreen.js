import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import Card from '../components/Card';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { useAuth } from '../context/AuthContext';
import usePrayerTimes, { formatClock } from '../hooks/usePrayerTimes';

function formatCountdownWithSeconds(ms) {
  if (ms == null) return '—';
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// Purely informational — this screen never marks a prayer as prayed.
// Marking happens on the Tracker tab; this one is for "when, and based on
// what location" only, which is why it carries the location/method controls.
export default function PrayerDetailScreen({ navigation }) {
  const { user } = useAuth();
  const { schedule, next, permissionDenied, locationLabel, locating, methodLabel, refreshLocation } =
    usePrayerTimes({ methodName: user?.calculationMethod });
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const remainingToNext = next ? next.time.getTime() - now.getTime() : null;
  const displayRemaining = remainingToNext != null && remainingToNext < 0 ? remainingToNext + 24 * 60 * 60 * 1000 : remainingToNext;

  return (
    <Screen>
      <AppText weight="bold" size={22}>
        مواقيت الصلاة
      </AppText>
      <AppText color={colors.inkSoft} size={13.5} style={{ marginTop: 4, marginBottom: spacing.lg }}>
        عرض فقط — علّم صلاتك من تبويب المتابعة
      </AppText>

      <Card style={styles.locationCard}>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={18} color={colors.amberDeep} />
          <View style={{ flex: 1 }}>
            <AppText weight="semibold" size={13.5}>
              {locating ? 'جارٍ تحديد الموقع...' : locationLabel || 'الموقع الحالي'}
            </AppText>
            <AppText size={11.5} color={colors.inkSoft} style={{ marginTop: 2 }}>
              طريقة الحساب: {methodLabel}
            </AppText>
          </View>
        </View>

        <View style={styles.locationActions}>
          <TouchableOpacity style={styles.locationBtn} onPress={refreshLocation} disabled={locating}>
            <Ionicons name="refresh-outline" size={14} color={colors.ink} />
            <AppText size={12.5} weight="semibold" style={{ marginRight: 4 }}>
              تحديث الموقع
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.locationBtn} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="options-outline" size={14} color={colors.ink} />
            <AppText size={12.5} weight="semibold" style={{ marginRight: 4 }}>
              تغيير طريقة الحساب
            </AppText>
          </TouchableOpacity>
        </View>

        {permissionDenied ? (
          <AppText size={11.5} color={colors.clay} style={{ marginTop: spacing.sm }}>
            إذن الموقع غير مفعّل — المواقيت المعروضة تقديرية (مكة المكرمة)
          </AppText>
        ) : null}
      </Card>

      {schedule.map((prayer) => {
        const isNext = next?.key === prayer.key;
        const hasPassed = prayer.time < now && !isNext;

        return (
          <View key={prayer.key} style={[styles.row, isNext && styles.rowActive]}>
            <View style={styles.rowMain}>
              <AppText weight="bold" size={16} color={isNext ? colors.white : colors.ink}>
                {prayer.label}
              </AppText>
              <AppText size={12} color={isNext ? colors.amberSoft : colors.inkSoft} style={{ marginTop: 2 }}>
                {hasPassed ? 'مضت' : isNext ? 'القادمة' : 'لاحقًا اليوم'}
              </AppText>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <AppText weight="bold" size={18} color={isNext ? colors.white : colors.ink} style={{ direction: 'ltr' }}>
                {formatClock(prayer.time)}
              </AppText>
              {isNext ? (
                <AppText size={12} color={colors.gold} style={{ marginTop: 2, direction: 'ltr' }}>
                  بعد {formatCountdownWithSeconds(displayRemaining)}
                </AppText>
              ) : null}
            </View>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  locationCard: { marginBottom: spacing.lg },
  locationRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm },
  locationActions: { flexDirection: 'row-reverse', gap: spacing.sm, marginTop: spacing.md },
  locationBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  rowActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  rowMain: { flex: 1 },
});
