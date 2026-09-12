import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import navigationRef from '../navigation/navigationRef';

const ID_MORNING = 'athr-card-morning';
const ID_EVENING = 'athr-card-evening';

async function ensurePermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function scheduleDailyIfMissing(identifier, hour, minute, body) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  if (scheduled.some((n) => n.identifier === identifier)) return;
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: 'بطاقة أثر',
      body,
      sound: true,
      // Deliberately generic — the point is a daily nudge to open the
      // card inside the app, not spoiling today's text in the tray.
      data: { screen: 'AthrCard' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, hour, minute, repeats: true },
  });
}

// Two fixed daily local notifications (morning/evening — not tied to
// prayer times, unlike usePrayerNotifications) that open today's card
// when tapped. Scheduled once (CALENDAR + repeats:true persists on its
// own — no need to reschedule every day the way prayer times do) and
// left alone after that; call this once near the app's root.
export default function useAthrCardNotifications() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const granted = await ensurePermission();
      if (!granted || cancelled) return;
      await scheduleDailyIfMissing(ID_MORNING, 7, 30, 'بطاقة اليوم بانتظارك — آية أو حديث أو تذكير لطيف قبل ما يبلّش يومك');
      await scheduleDailyIfMissing(ID_EVENING, 18, 0, 'قبل ما ينتهي يومك، خذ لحظة مع بطاقة أثر');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.screen === 'AthrCard' && navigationRef.isReady()) {
        navigationRef.navigate('AthrCard');
      }
    });
    return () => sub.remove();
  }, []);
}
