import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import { methodForCountry, METHOD_LABELS } from '../utils/methodForCountry';
import { getLastLocation, setLastLocation } from '../utils/locationCache';

// Only used when a location has never been acquired on this device at
// all — once we have a real fix, `getLastLocation`/`setLastLocation` take
// over and this is never reached again.
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
  // True once we're showing a location that isn't a fresh fix from just
  // now (either the last one we cached, or the generic Makkah fallback) —
  // lets the UI say so instead of implying it's live.
  const [isStaleLocation, setIsStaleLocation] = useState(false);
  const [now, setNow] = useState(new Date());

  // Hydrate instantly from whatever we last knew, before even asking for
  // permission — so times are already on-screen (from the phone's actual
  // last known place, not Makkah) the moment this hook mounts, fresh fix
  // or not.
  useEffect(() => {
    (async () => {
      const last = await getLastLocation();
      if (last) {
        setCoords(last.coords);
        setLocationLabel(last.label);
        setMethodName(last.methodName);
        setIsStaleLocation(true);
      }
    })();
  }, []);

  const refreshLocation = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        const last = await getLastLocation();
        if (last) {
          setCoords(last.coords);
          setLocationLabel(last.label);
          setMethodName(last.methodName);
          setIsStaleLocation(true);
        } else {
          setCoords((prev) => prev || FALLBACK_COORDS);
          setLocationLabel('مكة المكرمة (تقديري — الموقع غير مُفعّل)');
          setMethodName('UmmAlQura');
          setIsStaleLocation(true);
        }
        return;
      }
      setPermissionDenied(false);
      const position = await Location.getCurrentPositionAsync({});
      const nextCoords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCoords(nextCoords);
      setIsStaleLocation(false);

      // Reverse geocoding needs network — a fresh GPS fix doesn't. On
      // failure, keep whatever city label/method were last persisted
      // (read fresh from storage, not from this closure's captured state)
      // rather than wiping them, so a temporary offline moment doesn't
      // blank out a perfectly good label.
      const previous = await getLastLocation();
      let label = previous?.label ?? null;
      let method = previous?.methodName ?? 'MuslimWorldLeague';
      try {
        const places = await Location.reverseGeocodeAsync(nextCoords);
        const place = places?.[0];
        label = [place?.city || place?.subregion, place?.country].filter(Boolean).join('، ') || null;
        method = methodForCountry(place?.isoCountryCode);
      } catch (geocodeErr) {
        // offline or geocoder unavailable — `label`/`method` already hold
        // the last persisted values from above
      }
      setLocationLabel(label);
      setMethodName(method);

      await setLastLocation({ coords: nextCoords, label, methodName: method });
    } catch (err) {
      // GPS unavailable/timed out (airplane mode, no signal indoors, ...)
      // — fall back to the last location we actually knew, not Makkah,
      // unless we truly have never had one.
      setPermissionDenied(false);
      const last = await getLastLocation();
      if (last) {
        setCoords(last.coords);
        setLocationLabel(last.label);
        setMethodName(last.methodName);
      } else {
        setCoords((prev) => prev || FALLBACK_COORDS);
        setLocationLabel('مكة المكرمة (تقديري — تعذّر تحديد الموقع)');
        setMethodName('UmmAlQura');
      }
      setIsStaleLocation(true);
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
    isStaleLocation,
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
