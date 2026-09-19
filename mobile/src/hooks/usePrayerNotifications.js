import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { pickAdhanHadith, pickJamaahHadith } from '../constants/prayerHadiths';
import navigationRef from '../navigation/navigationRef';

const PRAYER_LABELS = {
  fajr: 'الفجر',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};

const ID_PREFIX = 'athr-prayer-';

// How long after adhan time to check in if the prayer still isn't marked
// done in the tracker — long enough that it isn't a false alarm the moment
// adhan is called, short enough to still be a timely nudge to get up.
const FORGOT_OFFSET_MIN = 30;

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
 * prayer schedule, the user's notification settings, or today's prayer log
 * changes. This only covers "while the app has run today at least once" — a
 * full background scheduler (days ahead, survives reinstall) would need a
 * native background task and is out of scope for this pass.
 */
export default function usePrayerNotifications(schedule, settings, prayerLog) {
  const atAdhan = Boolean(settings?.atAdhan);
  const reminderMinutes = settings?.reminderMinutes ?? null;
  const excused = Boolean(prayerLog?.excused);
  // A stable key that changes whenever any fard prayer's done-state
  // changes, without re-running the effect on every unrelated prayerLog
  // update (nawafil toggles, etc.) — used only as a dependency below.
  const fardKey = schedule?.map((p) => `${p.key}:${Boolean(prayerLog?.fard?.[p.key])}`).join(',');

  useEffect(() => {
    if (!schedule?.length) return undefined;

    let cancelled = false;

    (async () => {
      const granted = await ensurePermission();
      if (!granted || cancelled) return;

      await clearPreviousSchedule();
      const now = new Date();

      for (const prayer of schedule) {
        // The "did you forget to mark this?" check-in is independent of
        // the atAdhan/reminderMinutes settings below (it's a tracker
        // accountability nudge, not an adhan announcement), and — unlike
        // those — can still be worth scheduling even after adhan time
        // itself has passed, as long as its own 30-minute mark hasn't.
        if (!excused && !prayerLog?.fard?.[prayer.key]) {
          const forgotTime = new Date(prayer.time.getTime() + FORGOT_OFFSET_MIN * 60 * 1000);
          if (forgotTime > now) {
            const label = PRAYER_LABELS[prayer.key] || prayer.label;
            await Notifications.scheduleNotificationAsync({
              identifier: `${ID_PREFIX}${prayer.key}-forgot`,
              content: {
                title: 'هل نسيت الصلاة؟',
                body: `مرّ نص ساعة على أذان ${label} ولسا ما علّمتها بالمتابعة — إذا صليتها أشّرها بالتطبيق، وإذا لسا قم صلّها الآن 🕌`,
                sound: true,
                data: { screen: 'Tracker' },
              },
              trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: forgotTime },
            });
          }
        }

        if (prayer.time <= now) continue; // already passed — nothing else to schedule for it

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
    // Re-run once per day of prayer times, whenever the settings change, and
    // whenever any fard prayer's done-state changes (so marking one done —
    // or the excused toggle — cancels/skips its forgot-check immediately
    // rather than waiting for the next unrelated reschedule).
  }, [schedule?.[0]?.time?.toDateString(), atAdhan, reminderMinutes, excused, fardKey]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.screen === 'Tracker' && navigationRef.isReady()) {
        navigationRef.navigate('Tracker');
      }
    });
    return () => sub.remove();
  }, []);
}

// Called from useDailyData's togglePrayer right when a fard prayer is
// marked done, so the "did you forget?" check-in for it doesn't fire a
// half hour later for something already prayed. A harmless no-op if that
// notification was never scheduled or already fired/was cancelled.
async function cancelForgotReminder(prayerKey) {
  await Notifications.cancelScheduledNotificationAsync(`${ID_PREFIX}${prayerKey}-forgot`).catch(() => {});
}

export { cancelForgotReminder };

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
