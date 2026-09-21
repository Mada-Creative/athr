import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import Bounce from '../components/Bounce';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import { api } from '../api/client';
import openDirections from '../utils/openDirections';
import { fetchOsmMosques, fetchNearestOsmMosque, haversineMeters, regionToBounds } from '../utils/osmMosques';

// No `provider` prop on purpose — react-native-maps defaults to Apple Maps
// on iOS (zero setup, zero cost) and Google Maps on Android (the only map
// renderer Android actually has; still needs a Google Maps API key added
// to app.json before it'll render real tiles there — see
// mobile/MAPS_SETUP.md). Forcing PROVIDER_GOOGLE on iOS too would need
// that same key/billing on iOS as well, for a visual consistency that
// isn't worth the extra setup.
const DEFAULT_DELTA = 0.05;
const NEAREST_DELTA = 0.01;
// Mirrors the backend's own NEAREST_MAX_METERS (mosqueController.js) — how
// far "أقرب مسجد مني" is willing to look on the OSM side too, so neither
// source gets a wider search radius than the other.
const NEAREST_MAX_METERS = 30000;

// `onRequestClose` is only passed when this renders inside
// MosqueMapLauncher's floating-circle overlay on Home (no navigation
// header there to provide a back button) — omitted when reached by a
// normal stack push (e.g. a future deep link), where the header's own
// back arrow already does the job.
export default function MosqueMapScreen({ onRequestClose }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const mapRef = useRef(null);
  const [region, setRegion] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [mosques, setMosques] = useState([]);
  const [osmMosques, setOsmMosques] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [locating, setLocating] = useState(true);
  const [searchingNearest, setSearchingNearest] = useState(false);
  const osmDebounceRef = useRef(null);

  const loadMosques = useCallback(async (coords) => {
    try {
      const query = coords ? `?latitude=${coords.latitude}&longitude=${coords.longitude}` : '';
      const res = await api.get(`/mosques${query}`);
      setMosques(res.mosques);
    } catch (err) {
      // keep whatever was already loaded — the map still works with a
      // stale/empty list, just without fresh data
    }
  }, []);

  const loadOsmMosques = useCallback(async (mapRegion, options) => {
    const found = await fetchOsmMosques(regionToBounds(mapRegion), options);
    if (found) setOsmMosques(found);
  }, []);

  const onRegionChangeComplete = useCallback(
    (mapRegion) => {
      if (osmDebounceRef.current) clearTimeout(osmDebounceRef.current);
      // Waits for panning/zooming to actually settle rather than querying
      // Overpass (a shared public service, no API key) on every frame of
      // a drag gesture.
      osmDebounceRef.current = setTimeout(() => loadOsmMosques(mapRegion), 600);
    },
    [loadOsmMosques]
  );

  const detectLocation = useCallback(async () => {
    setLocating(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('يلزم إذن الموقع لعرض الخريطة وأقرب المساجد');
        setLocating(false);
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      const initialRegion = { ...coords, latitudeDelta: DEFAULT_DELTA, longitudeDelta: DEFAULT_DELTA };
      setUserCoords(coords);
      setRegion(initialRegion);
      await Promise.all([loadMosques(coords), loadOsmMosques(initialRegion, { force: true })]);
    } catch (err) {
      setError('تعذر تحديد الموقع الحالي');
    } finally {
      setLocating(false);
    }
  }, [loadMosques, loadOsmMosques]);

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  useEffect(
    () => () => {
      if (osmDebounceRef.current) clearTimeout(osmDebounceRef.current);
    },
    []
  );

  const onGoNearest = async () => {
    if (!userCoords) return;
    setSearchingNearest(true);
    try {
      // Our own database and OpenStreetMap searched side by side — neither
      // one alone is the full picture (ours is community-vetted but sparse
      // so far, OSM is broad but not reviewed by anyone here), so whichever
      // candidate is actually closer to the user wins, not whichever
      // source happened to answer first.
      const [dbRes, osmResult] = await Promise.all([
        api.get(`/mosques/nearest?latitude=${userCoords.latitude}&longitude=${userCoords.longitude}`).catch(() => ({ mosque: null })),
        fetchNearestOsmMosque(userCoords, NEAREST_MAX_METERS),
      ]);

      const candidates = [];
      if (dbRes.mosque) candidates.push({ ...dbRes.mosque, distance: haversineMeters(userCoords, dbRes.mosque) });
      if (osmResult?.mosque) candidates.push({ ...osmResult.mosque, distance: osmResult.distance });

      if (!candidates.length) {
        Alert.alert('لا يوجد مسجد قريب', 'ما في مساجد مسجّلة ضمن مسافة معقولة من موقعك بعد — كن أول من يضيف واحدًا!');
        return;
      }
      candidates.sort((a, b) => a.distance - b.distance);
      const nearestMosque = candidates[0];
      setSelected(nearestMosque);
      mapRef.current?.animateToRegion(
        { latitude: nearestMosque.latitude, longitude: nearestMosque.longitude, latitudeDelta: NEAREST_DELTA, longitudeDelta: NEAREST_DELTA },
        400
      );
    } catch (err) {
      Alert.alert('تعذر البحث', 'تحقّق من اتصالك بالإنترنت وحاول مرة أخرى');
    } finally {
      setSearchingNearest(false);
    }
  };

  const onReport = (mosque) => {
    Alert.prompt
      ? Alert.prompt(
          'الإبلاغ عن خطأ',
          `ما المشكلة في "${mosque.name}"؟ (اختياري)`,
          async (reason) => {
            try {
              await api.post(`/mosques/${mosque.id}/report`, { reason: reason || '' });
              Alert.alert('تم الإبلاغ', 'شكرًا، رح نراجعها.');
            } catch (err) {
              Alert.alert('تعذر الإرسال', 'تحقّق من اتصالك بالإنترنت وحاول مرة أخرى');
            }
          },
          'plain-text'
        )
      : Alert.alert('الإبلاغ عن خطأ', `الإبلاغ عن "${mosque.name}"؟`, [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'إبلاغ',
            style: 'destructive',
            onPress: async () => {
              try {
                await api.post(`/mosques/${mosque.id}/report`, { reason: '' });
                Alert.alert('تم الإبلاغ', 'شكرًا، رح نراجعها.');
              } catch (err) {
                Alert.alert('تعذر الإرسال', 'تحقّق من اتصالك بالإنترنت وحاول مرة أخرى');
              }
            },
          },
        ]);
  };

  return (
    <Screen scroll={false} contentStyle={styles.screenContent}>
      {error ? (
        <View style={styles.center}>
          <Ionicons name="location-outline" size={28} color={colors.inkFaint} />
          <AppText color={colors.clay} size={13.5} style={{ textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.lg }}>
            {error}
          </AppText>
          <Bounce style={styles.retryBtn} onPress={detectLocation}>
            <AppText size={13} weight="bold" color={colors.white}>
              إعادة المحاولة
            </AppText>
          </Bounce>
        </View>
      ) : locating || !region ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.amber} />
          <AppText color={colors.inkSoft} size={13} style={{ marginTop: spacing.sm }}>
            جارٍ تحديد موقعك...
          </AppText>
        </View>
      ) : (
        <>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={region}
            showsUserLocation
            showsMyLocationButton={false}
            onPress={() => setSelected(null)}
            onRegionChangeComplete={onRegionChangeComplete}
          >
            {/* Already mapped on OpenStreetMap — shown so the "+" flow is
                only ever needed for a mosque missing from both this and our
                own database, not every mosque that exists. A muted color
                keeps them visually secondary to the ones this app's own
                community actually vetted. */}
            {osmMosques.map((m) => (
              <Marker
                key={m.id}
                coordinate={{ latitude: m.latitude, longitude: m.longitude }}
                title={m.name}
                // The default native callout (a plain title/description
                // bubble) would otherwise pop up on tap and visually
                // compete with our own bottom detail card — one consistent
                // source of "you tapped a pin" info, not two.
                calloutEnabled={false}
                pinColor={selected?.id === m.id ? colors.sage : colors.inkFaint}
                onPress={() => setSelected(m)}
              />
            ))}
            {mosques.map((m) => (
              <Marker
                key={m.id}
                coordinate={{ latitude: m.latitude, longitude: m.longitude }}
                title={m.name}
                description={m.city}
                calloutEnabled={false}
                pinColor={selected?.id === m.id ? colors.sage : colors.amber}
                onPress={() => setSelected(m)}
              />
            ))}
          </MapView>

          {onRequestClose ? (
            <Bounce style={styles.closeBtn} onPress={onRequestClose}>
              <Ionicons name="close" size={18} color={colors.ink} />
            </Bounce>
          ) : null}

          <Bounce style={styles.nearestBtn} onPress={onGoNearest} disabled={searchingNearest}>
            {searchingNearest ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="locate-outline" size={16} color={colors.white} />
            )}
            <AppText size={13} weight="bold" color={colors.white} style={{ marginRight: 6 }}>
              أقرب مسجد مني
            </AppText>
          </Bounce>

          {!selected ? (
            <Bounce style={styles.addBtn} onPress={() => setSelected({ __addFlow: true })}>
              <Ionicons name="add" size={26} color={colors.white} />
            </Bounce>
          ) : null}

          {selected?.__addFlow ? (
            <AddMosqueCard
              coords={userCoords}
              colors={colors}
              styles={styles}
              onClose={() => setSelected(null)}
              onCreated={(mosque) => {
                setSelected(null);
                loadMosques(userCoords);
              }}
              onSuggestion={(mosque) => {
                setSelected(mosque);
                mapRef.current?.animateToRegion(
                  { latitude: mosque.latitude, longitude: mosque.longitude, latitudeDelta: NEAREST_DELTA, longitudeDelta: NEAREST_DELTA },
                  400
                );
              }}
            />
          ) : selected ? (
            <View style={styles.detailCard}>
              <View style={{ flex: 1 }}>
                <AppText weight="bold" size={15}>
                  {selected.name}
                  {selected.city ? ` - ${selected.city}` : ''}
                </AppText>
                {selected.source === 'osm' ? (
                  <AppText size={11} color={colors.inkFaint} style={{ marginTop: 2 }}>
                    من خرائط OpenStreetMap
                  </AppText>
                ) : null}
              </View>
              <Bounce style={styles.detailBtn} onPress={() => openDirections(selected.latitude, selected.longitude, selected.name)}>
                <Ionicons name="navigate" size={16} color={colors.white} />
                <AppText size={12.5} weight="bold" color={colors.white} style={{ marginRight: 4 }}>
                  التوجه
                </AppText>
              </Bounce>
              {/* Reporting only applies to mosques in our own database —
                  an OpenStreetMap pin isn't ours to review or remove. */}
              {selected.source !== 'osm' ? (
                <Bounce style={styles.detailBtnGhost} onPress={() => onReport(selected)}>
                  <Ionicons name="flag-outline" size={16} color={colors.clay} />
                </Bounce>
              ) : null}
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

// Inline "add mosque" card instead of a separate navigator screen — the
// whole point is "you're standing at the mosque right now", so it reuses
// the location this screen already has rather than re-requesting a GPS fix
// a few seconds later on a fresh screen.
function AddMosqueCard({ coords, colors, styles, onClose, onCreated, onSuggestion }) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const places = await Location.reverseGeocodeAsync(coords);
        const place = places?.[0];
        setCity([place?.city || place?.subregion, place?.country].filter(Boolean).join('، '));
      } catch (err) {
        // no network for geocoding — city stays blank, still submittable
      }
    })();
  }, [coords]);

  const onSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const res = await api.post('/mosques', { name: trimmed, city, latitude: coords.latitude, longitude: coords.longitude });
      Alert.alert('تم الإرسال', 'شكرًا! المسجد قيد المراجعة الآن، وح يظهر على الخريطة للجميع بعد الموافقة عليه خلال 48 ساعة.');
      onCreated(res.mosque);
    } catch (err) {
      if (err.status === 409 && err.data?.suggestion) {
        Alert.alert(
          'مسجد قريب موجود مسبقًا',
          `في مسجد مسجّل قريب باسم "${err.data.suggestion.name}" — هل تقصد نفس المسجد؟`,
          [{ text: 'حسنًا', onPress: () => onSuggestion(err.data.suggestion) }]
        );
      } else {
        Alert.alert('تعذر الإرسال', 'تحقّق من اتصالك بالإنترنت وحاول مرة أخرى');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // "position" (not "padding"/"height") is the one behavior that moves an
    // already absolutely-positioned view — this card sits pinned to the
    // bottom of the map (styles.detailCard), so it needs to slide up above
    // the keyboard rather than resize in place.
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : undefined} style={styles.detailCard}>
      <View style={{ flex: 1 }}>
        <AppText weight="bold" size={14} style={{ marginBottom: spacing.xs }}>
          إضافة مسجد في موقعك الحالي
        </AppText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="اسم المسجد"
          placeholderTextColor={colors.inkFaint}
          style={styles.nameInput}
          textAlign="right"
          onSubmitEditing={onSubmit}
          returnKeyType="done"
        />
        {city ? (
          <AppText size={11.5} color={colors.inkFaint} style={{ marginTop: 4 }}>
            {city}
          </AppText>
        ) : null}
      </View>
      <Bounce style={styles.detailBtn} onPress={onSubmit} disabled={submitting || !name.trim()}>
        {submitting ? <ActivityIndicator size="small" color={colors.white} /> : <Ionicons name="checkmark" size={18} color={colors.white} />}
      </Bounce>
      <Bounce style={styles.detailBtnGhost} onPress={onClose}>
        <Ionicons name="close" size={16} color={colors.inkFaint} />
      </Bounce>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    screenContent: { flex: 1, padding: 0 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    retryBtn: {
      marginTop: spacing.lg,
      backgroundColor: colors.accentDark,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
    },
    closeBtn: {
      position: 'absolute',
      top: spacing.lg,
      right: spacing.lg,
      width: 34,
      height: 34,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    nearestBtn: {
      position: 'absolute',
      top: spacing.lg,
      alignSelf: 'center',
      flexDirection: 'row-reverse',
      alignItems: 'center',
      backgroundColor: colors.accentDark,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    addBtn: {
      position: 'absolute',
      bottom: spacing.xl,
      left: spacing.lg,
      width: 52,
      height: 52,
      borderRadius: radius.pill,
      backgroundColor: colors.amber,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 5,
    },
    detailCard: {
      position: 'absolute',
      bottom: spacing.xl,
      left: spacing.lg,
      right: spacing.lg,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    detailBtn: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      backgroundColor: colors.sage,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
    },
    detailBtnGhost: {
      width: 36,
      height: 36,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundAlt,
    },
    nameInput: {
      backgroundColor: colors.backgroundAlt,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 8,
      fontSize: 14,
      color: colors.ink,
    },
  });
}
