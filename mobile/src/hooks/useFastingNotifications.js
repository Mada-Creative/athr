import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import navigationRef from '../navigation/navigationRef';

const ID_BEFORE_MONDAY = 'athr-fasting-before-monday';
const ID_BEFORE_THURSDAY = 'athr-fasting-before-thursday';

// expo-notifications' WEEKLY trigger uses the same weekday numbering as
// JS's own Date#getDay() — 1=Sunday...7=Saturday (so Sunday=1, not 0).
// Sunday night reminds for Monday's fast, Wednesday night for Thursday's.
const WEEKDAY_SUNDAY = 1;
const WEEKDAY_WEDNESDAY = 4;
// 9pm the night before — late enough to be an evening reminder, early
// enough that niyyah (which only needs to happen before fajr) is still an
// easy, unrushed decision rather than a last-minute one.
const REMINDER_HOUR = 21;
const REMINDER_MINUTE = 0;

async function ensurePermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function scheduleWeeklyIfMissing(identifier, weekday, body) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  if (scheduled.some((n) => n.identifier === identifier)) return;
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: 'صيام السنة',
      body,
      sound: true,
      data: { screen: 'Home' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday,
      hour: REMINDER_HOUR,
      minute: REMINDER_MINUTE,
    },
  });
}

// Two fixed weekly local notifications, the night before each sunnah
// fasting day, so there's time to make the niyyah and get suhoor ready —
// not a same-day nudge, which would land well after fajr already passed.
// Scheduled once (WEEKLY persists on its own, same as useAthrCardNotifications'
// daily ones) and left alone after that; call this once near the app's root.
export default function useFastingNotifications() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const granted = await ensurePermission();
      if (!granted || cancelled) return;
      await scheduleWeeklyIfMissing(
        ID_BEFORE_MONDAY,
        WEEKDAY_SUNDAY,
        'بكرا الاثنين — من السنة صيامه، انوِ الصيام الليلة وجهّز سحورك 🌙'
      );
      await scheduleWeeklyIfMissing(
        ID_BEFORE_THURSDAY,
        WEEKDAY_WEDNESDAY,
        'بكرا الخميس — من السنة صيامه، انوِ الصيام الليلة وجهّز سحورك 🌙'
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.screen === 'Home' && navigationRef.isReady()) {
        navigationRef.navigate('Home');
      }
    });
    return () => sub.remove();
  }, []);
}
