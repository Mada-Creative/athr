import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import navigationRef from '../navigation/navigationRef';

const ID = 'athr-quran-reminder';

async function ensurePermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

// A fixed-clock-time daily reminder for the user's own chosen wird time
// (Settings → "تذكير ورد القرآن"), off by default. Unlike
// usePrayerNotifications/useAthrCardNotifications — whose content shifts
// day to day (solar prayer times, a different card) and so has to be
// recomputed and rescheduled on every app open — this notification's time
// and text never change once set, so it uses expo-notifications' own DAILY
// trigger and lets the OS repeat it forever. Rescheduling it ourselves on
// every app open, the way those other hooks have to, would just reintroduce
// the "doesn't fire unless the app happens to be opened that day" bug that
// pattern has for prayer notifications (see usePrayerNotifications.js) —
// here there's a trigger type that avoids needing that pattern at all.
//
// It fires every day at the chosen time regardless of whether that day's
// wird is already marked done — same as a plain alarm clock, not a
// conditional nudge — since checking completion would require the same
// "has to run today" rescheduling this trigger type exists to avoid.
export default function useQuranReminderNotification(reminderTime) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Notifications.cancelScheduledNotificationAsync(ID).catch(() => {});
      if (!reminderTime || cancelled) return;

      const [hour, minute] = reminderTime.split(':').map(Number);
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) return;

      const granted = await ensurePermission();
      if (!granted || cancelled) return;

      await Notifications.scheduleNotificationAsync({
        identifier: ID,
        content: {
          title: 'وِردك من القرآن',
          body: 'خصص شوي من وقتك اليوم لورد القرآن 📖',
          sound: true,
          data: { screen: 'Quran' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [reminderTime]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.screen === 'Quran' && navigationRef.isReady()) {
        navigationRef.navigate('Quran');
      }
    });
    return () => sub.remove();
  }, []);
}
