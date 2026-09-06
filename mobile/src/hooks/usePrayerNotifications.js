import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const PRAYER_LABELS = {
  fajr: 'الفجر',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};

const ID_PREFIX = 'athr-prayer-';

async function ensurePermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function clearPreviousSchedule() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ours = scheduled.filter((n) => n.identifier?.startsWith(ID_PREFIX));
  await Promise.all(ours.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

/**
 * (Re)schedules today's remaining prayer notifications whenever the computed
 * prayer schedule or the user's notification settings change. This only
 * covers "while the app has run today at least once" — a full background
 * scheduler (days ahead, survives reinstall) would need a native background
 * task and is out of scope for this pass.
 */
export default function usePrayerNotifications(schedule, settings) {
  const atAdhan = Boolean(settings?.atAdhan);
  const reminderMinutes = settings?.reminderMinutes ?? null;

  useEffect(() => {
    if (!schedule?.length) return undefined;
    if (!atAdhan && !reminderMinutes) {
      // Nothing to schedule — but still clear anything left over from a
      // previous session where notifications were on.
      clearPreviousSchedule();
      return undefined;
    }

    let cancelled = false;

    (async () => {
      const granted = await ensurePermission();
      if (!granted || cancelled) return;

      await clearPreviousSchedule();
      const now = new Date();

      for (const prayer of schedule) {
        if (prayer.time <= now) continue; // already passed today

        if (atAdhan) {
          await Notifications.scheduleNotificationAsync({
            identifier: `${ID_PREFIX}${prayer.key}-adhan`,
            content: {
              title: 'حان وقت الصلاة',
              body: `حان الآن وقت صلاة ${PRAYER_LABELS[prayer.key] || prayer.label}`,
              sound: true,
            },
            trigger: { date: prayer.time },
          });
        }

        if (reminderMinutes) {
          const reminderTime = new Date(prayer.time.getTime() - reminderMinutes * 60 * 1000);
          if (reminderTime > now) {
            await Notifications.scheduleNotificationAsync({
              identifier: `${ID_PREFIX}${prayer.key}-reminder`,
              content: {
                title: 'تذكير بموعد الصلاة',
                body: `تبقّى ${reminderMinutes} دقيقة على صلاة ${PRAYER_LABELS[prayer.key] || prayer.label}`,
                sound: true,
              },
              trigger: { date: reminderTime },
            });
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Re-run once per day of prayer times, and whenever the settings change.
  }, [schedule?.[0]?.time?.toDateString(), atAdhan, reminderMinutes]);
}

export async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('prayers', {
    name: 'مواعيد الصلاة',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}
