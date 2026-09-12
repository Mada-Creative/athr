import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import navigationRef from '../navigation/navigationRef';

const ID_PREFIX = 'athr-friday-sunnah-';
const ID_FRIDAY = `${ID_PREFIX}reminder`;

// 3 hours before dhuhr, same reasoning as useAthkarReminderNotifications
// for why this is a DATE trigger recomputed daily rather than a fixed
// WEEKLY one: dhuhr's own clock time drifts through the year, so "3 hours
// before dhuhr" isn't a fixed hour/minute WEEKLY could just repeat.
const OFFSET_MIN = 180;

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

// (Re)schedules Friday's sunnah reminder whenever the computed prayer
// schedule changes — same daily-recompute shape as
// useAthkarReminderNotifications, called from the same place (Home) for
// the same reason. On every day but Friday this just clears any leftover
// schedule and does nothing; there's nothing to (re)confirm until dhuhr's
// own time is known for that Friday.
export default function useFridaySunnahNotifications(schedule) {
  useEffect(() => {
    if (!schedule?.length) return undefined;
    let cancelled = false;

    (async () => {
      const granted = await ensurePermission();
      if (!granted || cancelled) return;

      await clearPreviousSchedule();

      const now = new Date();
      if (now.getDay() !== 5) return; // not Friday — nothing to schedule today

      const dhuhr = schedule.find((p) => p.key === 'dhuhr');
      if (!dhuhr) return;

      const reminderTime = new Date(dhuhr.time.getTime() - OFFSET_MIN * 60 * 1000);
      if (reminderTime <= now) return; // window already passed today

      await Notifications.scheduleNotificationAsync({
        identifier: ID_FRIDAY,
        content: {
          title: 'سنن يوم الجمعة',
          body: 'اليوم الجمعة — جهّز نفسك: اغتسال، تطيّب، تبكير، وسورة الكهف قبل ما تروح',
          sound: true,
          data: { screen: 'FridaySunnah' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderTime },
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [schedule?.[0]?.time?.toDateString()]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.screen === 'FridaySunnah' && navigationRef.isReady()) {
        navigationRef.navigate('FridaySunnah');
      }
    });
    return () => sub.remove();
  }, []);
}
