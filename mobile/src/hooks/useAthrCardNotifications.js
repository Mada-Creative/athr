import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import navigationRef from '../navigation/navigationRef';
import { cardForDate, cardIndexForDate, isHadithSourced, HADITH_PREFIX } from '../constants/athrCards';

const ID_PREFIX = 'athr-card-';
const ID_MORNING = `${ID_PREFIX}morning`;
const ID_EVENING = `${ID_PREFIX}evening`;

const MORNING_HOUR = 7;
const MORNING_MINUTE = 30;
const EVENING_HOUR = 18;
const EVENING_MINUTE = 0;

const TYPE_LEAD = {
  ayah: '📖 آية اليوم',
  hadith: '📿 حديث اليوم',
  dua: '🤲 دعاء اليوم',
  wisdom: '🌿 حكمة اليوم',
};

// Two different closing nudges, rotated by day so the notification doesn't
// read like a stuck recording (same reasoning as useAthkarReminderNotifications'
// per-weekday message lists).
const SHARE_LINES = [
  'شارك هذه البطاقة مع أصحابك، فالدال على الخير كفاعله 💛',
  'أرسلها لصديق قد ينتفع بها اليوم 🤍',
];

// Builds the actual card content into the notification body instead of a
// generic "today's card is waiting" teaser — a real excerpt earns the tap
// far better than a content-free nudge. `variant` rotates the framing.
function buildCardBody(card, variant) {
  const hadithSourced = isHadithSourced(card);
  // "بلّغوا عني ولو آية" is itself an instruction to convey the Prophet's ﷺ
  // words — using it as the opener for a hadith card would repeat "قال
  // رسول الله ﷺ" right after, since the quote below already carries that
  // prefix. Reserve this opener for ayah/dua/wisdom cards, which don't.
  const opener =
    !hadithSourced && variant % 2 === 1
      ? 'قال رسول الله ﷺ: «بلّغوا عني ولو آية»'
      : TYPE_LEAD[card.type] || 'بطاقة اليوم';
  const quoted = hadithSourced ? `${HADITH_PREFIX}:\n"${card.text}"` : `"${card.text}"`;
  const share = SHARE_LINES[variant % SHARE_LINES.length];
  return `${opener}\n\n${quoted}\n— ${card.source}\n\n${share}`;
}

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

// Today's slot if it hasn't passed yet, otherwise tomorrow's — the caller
// then reads *that* resolved date's card, so the content always matches
// the day the notification will actually land on.
function nextOccurrence(hour, minute, now) {
  const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  if (candidate > now) return candidate;
  candidate.setDate(candidate.getDate() + 1);
  return candidate;
}

async function scheduleOne(identifier, date, variant) {
  const card = cardForDate(date);
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: 'بطاقة أثر',
      body: buildCardBody(card, variant),
      sound: true,
      data: { screen: 'AthrCard' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}

// Two fixed daily local notifications (morning/evening — not tied to prayer
// times, unlike usePrayerNotifications) that open today's card when tapped.
// Content now depends on which card is actually live that day, so — same
// as useAthkarReminderNotifications — this has to recompute and reschedule
// with a one-shot DATE trigger rather than a single CALENDAR+repeats
// notification whose text would otherwise be stuck forever on whatever was
// live the day it was first scheduled.
export default function useAthrCardNotifications() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const granted = await ensurePermission();
      if (!granted || cancelled) return;

      await clearPreviousSchedule();
      const now = new Date();

      const morningDate = nextOccurrence(MORNING_HOUR, MORNING_MINUTE, now);
      const eveningDate = nextOccurrence(EVENING_HOUR, EVENING_MINUTE, now);
      await scheduleOne(ID_MORNING, morningDate, cardIndexForDate(morningDate));
      await scheduleOne(ID_EVENING, eveningDate, cardIndexForDate(eveningDate) + 1);
    })();
    return () => {
      cancelled = true;
    };
    // No day-changing prop to key off (unlike the prayer-time-driven hooks)
    // — this reruns on mount, which in practice means "at least once most
    // days the app is opened", the same accepted limitation documented on
    // usePrayerNotifications.
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
