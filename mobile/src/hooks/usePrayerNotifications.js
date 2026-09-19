import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { pickAdhanHadith, pickJamaahHadith } from '../constants/prayerHadiths';

const PRAYER_LABELS = {
  fajr: 'الفجر',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};

const ID_PREFIX = 'athr-prayer-';

// Android locks a notification's sound to its *channel*, unlike iOS where
// each notification carries its own sound — a single "prayers" channel
// can't give the fajr adhan, the other-prayer adhan, and the reminder three
// different sounds. Three channels, one per sound, is the only way.
const CHANNEL_ADHAN = 'prayers-adhan';
const CHANNEL_ADHAN_FAJR = 'prayers-adhan-fajr';
const CHANNEL_REMINDER = 'prayers-reminder';

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
          // Fajr gets its own recording (carries "الصلاة خير من النوم", the
          // line unique to the fajr call to prayer) — every other prayer
          // shares the plain adhan clip. Both are short excerpts, not the
          // full multi-minute adhan: iOS silently falls back to the default
          // sound for any custom notification sound over 30 seconds.
          const isFajr = prayer.key === 'fajr';
          // A hadith on the virtue of prayer (or, periodically, that
          // specific prayer's own hadith — the rawatib one for dhuhr, the
          // "البردين" one for fajr/asr, etc.) so the notification is a
          // reason to get up, not just a clock announcement.
          const adhanHadith = pickAdhanHadith(prayer.key, prayer.time);
          await Notifications.scheduleNotificationAsync({
            identifier: `${ID_PREFIX}${prayer.key}-adhan`,
            content: {
              title: 'حان وقت الصلاة',
              body: `حان الآن وقت صلاة ${PRAYER_LABELS[prayer.key] || prayer.label}\n\n"${adhanHadith.text}"\n— ${adhanHadith.source}`,
              // iOS reads this per-notification; Android ignores it and uses
              // whatever sound the channelId below was created with instead.
              sound: isFajr ? 'adhan_fajr.wav' : 'adhan.wav',
              ...(Platform.OS === 'android' ? { channelId: isFajr ? CHANNEL_ADHAN_FAJR : CHANNEL_ADHAN } : null),
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: prayer.time },
          });
        }

        if (reminderMinutes) {
          const reminderTime = new Date(prayer.time.getTime() - reminderMinutes * 60 * 1000);
          if (reminderTime > now) {
            // The reminder's whole point is the window to still get up and
            // go — always a jama'ah/walking-to-the-mosque hadith, not a
            // general one, to actually push toward that instead of just
            // flagging the time.
            const jamaahHadith = pickJamaahHadith(prayer.key, prayer.time);
            await Notifications.scheduleNotificationAsync({
              identifier: `${ID_PREFIX}${prayer.key}-reminder`,
              content: {
                title: 'تذكير بموعد الصلاة',
                body: `تبقّى ${reminderMinutes} دقيقة على صلاة ${PRAYER_LABELS[prayer.key] || prayer.label} — قم وأدركها في جماعة\n\n"${jamaahHadith.text}"\n— ${jamaahHadith.source}`,
                sound: 'prayer_reminder.wav',
                ...(Platform.OS === 'android' ? { channelId: CHANNEL_REMINDER } : null),
              },
              trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderTime },
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
  // Android reads a resource name (no extension, from res/raw) rather than
  // the bundle filename iOS uses — the expo-notifications config plugin
  // copies the same source files to both places at build time.
  await Notifications.setNotificationChannelAsync(CHANNEL_ADHAN, {
    name: 'أذان الصلاة',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'adhan',
  });
  await Notifications.setNotificationChannelAsync(CHANNEL_ADHAN_FAJR, {
    name: 'أذان الفجر',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'adhan_fajr',
  });
  await Notifications.setNotificationChannelAsync(CHANNEL_REMINDER, {
    name: 'تذكير الصلاة',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'prayer_reminder',
  });
}
