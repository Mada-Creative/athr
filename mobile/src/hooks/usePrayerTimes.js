import { useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';

// Falls back to the coordinates of Makkah when location permission is
// declined, so the app always has something sensible to show.
const FALLBACK_COORDS = { latitude: 21.3891, longitude: 39.8579 };

const PRAYER_LABELS = {
  fajr: 'الفجر',
  sunrise: 'الشروق',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};

function resolveMethod(name) {
  const map = {
    UmmAlQura: CalculationMethod.UmmAlQura,
    MuslimWorldLeague: CalculationMethod.MuslimWorldLeague,
    Egyptian: CalculationMethod.Egyptian,
    Karachi: CalculationMethod.Karachi,
    NorthAmerica: CalculationMethod.NorthAmerica,
  };
  return (map[name] || CalculationMethod.UmmAlQura)();
}

export default function usePrayerTimes({ methodName = 'UmmAlQura' } = {}) {
  const [coords, setCoords] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setPermissionDenied(true);
          setCoords(FALLBACK_COORDS);
          return;
        }
        const position = await Location.getCurrentPositionAsync({});
        setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      } catch (err) {
        setPermissionDenied(true);
        setCoords(FALLBACK_COORDS);
      }
    })();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(timer);
  }, []);

  const times = useMemo(() => {
    if (!coords) return null;
    const coordinates = new Coordinates(coords.latitude, coords.longitude);
    const params = resolveMethod(methodName);
    return new PrayerTimes(coordinates, now, params);
  }, [coords, methodName, now.toDateString()]);

  const schedule = useMemo(() => {
    if (!times) return [];
    return ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].map((key) => ({
      key,
      label: PRAYER_LABELS[key],
      time: times[key],
    }));
  }, [times]);

  // "Next prayer" only ever counts down to one of the 5 obligatory prayers —
  // sunrise is kept in `schedule` above just because `adhan` returns it
  // alongside the others, not because it's a prayer to countdown to.
  const fardOnly = useMemo(() => schedule.filter((p) => p.key !== 'sunrise'), [schedule]);

  const next = useMemo(() => {
    if (!times) return null;
    const upcoming = fardOnly.find((p) => p.time > now);
    return upcoming || fardOnly[0];
  }, [fardOnly, times, now]);

  const remainingMs = next ? next.time.getTime() - now.getTime() : null;

  return {
    coords,
    permissionDenied,
    loading: !coords,
    schedule: fardOnly,
    next,
    remainingMs: remainingMs && remainingMs < 0 ? remainingMs + 24 * 60 * 60 * 1000 : remainingMs,
  };
}

export function formatCountdown(ms) {
  if (ms == null) return '—:—';
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatClock(date) {
  // Formatted manually (rather than via toLocaleTimeString) so it doesn't
  // depend on the JS engine shipping full ICU data for the "ar" locale.
  if (!date) return '—:—';
  const hours24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours24 < 12 ? 'ص' : 'م';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes} ${period}`;
}
