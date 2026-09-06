import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import { methodForCountry, METHOD_LABELS } from '../utils/methodForCountry';

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

export default function usePrayerTimes() {
  const [coords, setCoords] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [locationLabel, setLocationLabel] = useState(null);
  // Derived from the detected country — not a setting anyone picks by hand,
  // since getting it "right" means knowing conventions most people never
  // think about. Defaults to the most widely-used convention until located.
  const [methodName, setMethodName] = useState('MuslimWorldLeague');
  const [locating, setLocating] = useState(false);
  const [now, setNow] = useState(new Date());

  const refreshLocation = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setCoords((prev) => prev || FALLBACK_COORDS);
        setLocationLabel('مكة المكرمة (تقديري — الموقع غير مُفعّل)');
        setMethodName('UmmAlQura');
        return;
      }
      setPermissionDenied(false);
      const position = await Location.getCurrentPositionAsync({});
      const nextCoords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCoords(nextCoords);

      try {
        const places = await Location.reverseGeocodeAsync(nextCoords);
        const place = places?.[0];
        const label = [place?.city || place?.subregion, place?.country].filter(Boolean).join('، ');
        setLocationLabel(label || null);
        setMethodName(methodForCountry(place?.isoCountryCode));
      } catch (geocodeErr) {
        setLocationLabel(null);
      }
    } catch (err) {
      setPermissionDenied(true);
      setCoords((prev) => prev || FALLBACK_COORDS);
      setLocationLabel('مكة المكرمة (تقديري — تعذّر تحديد الموقع)');
      setMethodName('UmmAlQura');
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    refreshLocation();
    // Only ever runs automatically once, on mount — refreshLocation() is
    // exposed so the UI can trigger it again (e.g. an "update location" button).
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
    locating,
    locationLabel,
    methodLabel: METHOD_LABELS[methodName] || methodName,
    refreshLocation,
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
