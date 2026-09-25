import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import navigationRef from '../navigation/navigationRef';

const ID_PREFIX = 'athr-athkar-';
const ID_MORNING = `${ID_PREFIX}morning`;
const ID_EVENING = `${ID_PREFIX}evening`;

// Tied to prayer times (which shift daily, unlike useAthrCardNotifications'
// fixed clock times), so — same as usePrayerNotifications — this has to
// recompute and reschedule once a day rather than set a single repeating
// trigger. A DATE trigger for today's specific time, not CALENDAR/WEEKLY.
const MORNING_OFFSET_MIN = 60; // 1h after fajr
const EVENING_OFFSET_MIN = 40; // 40min after asr

// A different line each day (getDay(): 0=Sunday...6=Saturday) so it reads
// as a nudge from someone paying attention, not a stuck recording — same
// spirit as the varied-text idea behind بطاقات أثر.
const MORNING_MESSAGES = [
  'صباح الخير! ابدأ يومك بأذكار الصباح — درعك ليوم كامل 🌅',
  'أذكار الصباح لسا ما قريتها؟ دقيقتين وتكسب حصن يومك كله',
  'من قال أذكار الصباح كُفي شر ما يصيبه — خذ لحظة وابدأ فيها',
  'يومك بيبلّش أحلى بالذكر — أذكار الصباح بانتظارك',
  'لا تخلّي يومك يمشي بدون حصنك الصباحي — أذكار الصباح الآن',
  'صباح الجمعة مبارك — ابدأه بأذكار الصباح قبل ما تنشغل',
  'آخر أيام الأسبوع، وأذكار الصباح أول إشي تربحه فيه',
];

const EVENING_MESSAGES = [
  'قربت الشمس تغيب — خذ لحظة لأذكار المساء قبل ما ينزل الليل',
  'أذكار المساء بتحصّنك لبقية يومك — لا تفوّتها اليوم',
  'قبل ما تنشغل بباقي يومك، خذ دقيقتين لأذكار المساء',
  'نص الأسبوع مرّ — وأذكار المساء لسا موعدها الآن',
  'أذكار المساء بانتظارك، خاصة قبل ليلة الجمعة المباركة',
  'اختم جمعتك بأذكار المساء وطمّن قلبك قبل الليل',
  'آخر أذكار مساء بالأسبوع — لا تخليها تفوت',
];

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

async function scheduleOne(identifier, title, body, date, category) {
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body,
      sound: true,
      data: { screen: 'AthkarCounter', category },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}

// (Re)schedules today's morning/evening athkar reminders whenever the
// computed prayer schedule changes — same "reschedule once per day of
// prayer times" shape as usePrayerNotifications, called from the same
// place (Home, which is where `schedule` already gets computed for
// display) for the same reason: no need to prompt for location access
// anywhere else just to keep this ticking in the background.
export default function useAthkarReminderNotifications(schedule) {
  useEffect(() => {
    if (!schedule?.length) return undefined;
    let cancelled = false;

    (async () => {
      const granted = await ensurePermission();
      if (!granted || cancelled) return;

      await clearPreviousSchedule();
      const now = new Date();

      const fajr = schedule.find((p) => p.key === 'fajr');
      const asr = schedule.find((p) => p.key === 'asr');

      if (fajr) {
        const morningTime = new Date(fajr.time.getTime() + MORNING_OFFSET_MIN * 60 * 1000);
        if (morningTime > now) {
          await scheduleOne(ID_MORNING, 'أذكار الصباح', MORNING_MESSAGES[morningTime.getDay()], morningTime, 'morning');
        }
      }

      if (asr) {
        const eveningTime = new Date(asr.time.getTime() + EVENING_OFFSET_MIN * 60 * 1000);
        if (eveningTime > now) {
          await scheduleOne(ID_EVENING, 'أذكار المساء', EVENING_MESSAGES[eveningTime.getDay()], eveningTime, 'evening');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Re-run once per day of prayer times, same dependency shape as
    // usePrayerNotifications.
  }, [schedule?.[0]?.time?.toDateString()]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.screen === 'AthkarCounter' && navigationRef.isReady()) {
        navigationRef.navigate('AthkarCounter', { category: data.category });
      }
    });
    return () => sub.remove();
  }, []);
}
