import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Keyboard, Platform, StyleSheet, TextInput, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
// How many times (and how long to wait between) the *initial* OSM pin load
// retries after a failed/timed-out Overpass request — without this, a
// single dropped request on load left the map with no pins at all until
// the user happened to pan or zoom (the only other thing that triggers a
// fetch), which could mean a genuinely empty-looking map for good.
const OSM_RETRY_DELAYS_MS = [0, 2500, 6000];

function formatDistance(meters) {
  if (meters == null) return null;
  if (meters < 1000) return `${Math.round(meters)} م`;
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} كم`;
}

export default function MosqueMapScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  // FloatingTabBar floats over this screen too (it's one of the tabs) —
  // this screen's own Screen deliberately excludes the bottom safe-area
  // edge (the map should draw edge-to-edge), so its own bottom-pinned
  // controls need enough clearance to clear the tab bar's own footprint
  // (see FloatingTabBar's BAR_MAX_HEIGHT/BAR_MAX_BOTTOM) rather than
  // hiding behind or overlapping it.
  const bottomClearance = insets.bottom + 90;
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

  // Every OSM fetch — the initial load AND every settled pan/zoom — gets
  // the same retry-with-backoff treatment. Earlier this only covered the
  // initial load, on the theory that panning would naturally trigger
  // another attempt on its own — but a pan to an area that then also fails
  // (same flaky connection, not just one unlucky request) was left with no
  // pins and no second try either, which is exactly the "moved the map,
  // pins never showed up" report this fixes.
  const loadOsmMosquesRetrying = useCallback(async (mapRegion) => {
    for (const delay of OSM_RETRY_DELAYS_MS) {
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      const found = await fetchOsmMosques(regionToBounds(mapRegion));
      if (found) {
        setOsmMosques(found);
        return;
      }
    }
    // Every retry failed — silently leave whatever pins were already on
    // screen (from an earlier successful load, or none yet) rather than
    // showing a "couldn't load" indicator: a background refresh failing
    // (e.g. after panning slightly) must never cast doubt on pins that are
    // still sitting right there on the map, and there's nothing useful to
    // tell the user about a dropped request they didn't ask about.
  }, []);

  const onRegionChangeComplete = useCallback(
    (mapRegion) => {
      if (osmDebounceRef.current) clearTimeout(osmDebounceRef.current);
      // Waits for panning/zooming to actually settle rather than querying
      // Overpass (a shared public service, no API key) on every frame of
      // a drag gesture.
      osmDebounceRef.current = setTimeout(() => loadOsmMosquesRetrying(mapRegion), 600);
    },
    [loadOsmMosquesRetrying]
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
      // Not awaited — its retries (up to ~8.5s of backoff) would otherwise
      // hold the loading spinner up for no reason; the map is fully usable
      // with just our own DB mosques + the user's location, and OSM pins
      // pop in whenever that finishes, retries included.
      loadOsmMosquesRetrying(initialRegion);
      await loadMosques(coords);
    } catch (err) {
      setError('تعذر تحديد الموقع الحالي');
    } finally {
      setLocating(false);
    }
  }, [loadMosques, loadOsmMosquesRetrying]);

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
      // The pins already on screen (osmMosques — loaded once, successfully,
      // for the current viewport) are a free, instant, zero-network-risk
      // candidate pool — computed client-side, they can't fail the way a
      // fresh Overpass round-trip can. A close match from them is used
      // immediately instead of also gambling on another live request that
      // has no reason to succeed just because the last one eventually did.
      const localCandidates = osmMosques.map((m) => ({ ...m, distance: haversineMeters(userCoords, m) }));
      const localNearest = localCandidates.length
        ? localCandidates.reduce((a, b) => (b.distance < a.distance ? b : a))
        : null;

      // Our own database and OpenStreetMap searched side by side — neither
      // one alone is the full picture (ours is community-vetted but sparse
      // so far, OSM is broad but not reviewed by anyone here), so whichever
      // candidate is actually closer to the user wins, not whichever
      // source happened to answer first.
      const [dbRes, osmResult] = await Promise.all([
        api.get(`/mosques/nearest?latitude=${userCoords.latitude}&longitude=${userCoords.longitude}`).catch(() => ({ mosque: null })),
        // Skip the live radius search entirely when the pins already on
        // screen already have something close — no reason to risk another
        // Overpass round-trip for a result that can't realistically beat
        // what's already sitting in front of the user. No radius cap
        // otherwise — keeps widening (see SEARCH_TIERS_METERS in
        // osmMosques.js) until it finds something or genuinely runs out of
        // ground to cover, rather than stopping at a fixed distance and
        // reporting "nothing nearby" when a mosque just happens to be far.
        localNearest && localNearest.distance < 3000 ? Promise.resolve(null) : fetchNearestOsmMosque(userCoords),
      ]);

      const candidates = [];
      if (dbRes.mosque) candidates.push({ ...dbRes.mosque, distance: haversineMeters(userCoords, dbRes.mosque) });
      if (osmResult?.mosque) candidates.push({ ...osmResult.mosque, distance: osmResult.distance });
      if (localNearest) candidates.push(localNearest);

      if (!candidates.length) {
        Alert.alert('لا يوجد مسجد قريب', 'ما لقينا أي مسجد ضمن 300 كم من موقعك — كن أول من يضيف واحدًا!');
        return;
      }
      candidates.sort((a, b) => a.distance - b.distance);
      const nearestMosque = candidates[0];
      setSelected(nearestMosque);
      // Fits both the user's own position and the mosque in view together
      // (not just a tight zoom on the mosque alone) — regardless of where
      // the map was scrolled to when this was pressed, the result always
      // grounds "where I am" against "where it is", not just the
      // destination in isolation.
      mapRef.current?.fitToCoordinates(
        [userCoords, { latitude: nearestMosque.latitude, longitude: nearestMosque.longitude }],
        { edgePadding: { top: 120, right: 60, bottom: bottomClearance + 80, left: 60 }, animated: true }
      );
    } catch (err) {
      Alert.alert('تعذر البحث', 'تحقّق من اتصالك بالإنترنت وحاول مرة أخرى');
    } finally {
      setSearchingNearest(false);
    }
  };

  // Jumps back to the user's own real GPS position at the default zoom —
  // for whenever they've panned/zoomed off browsing the map and just want
  // to find themselves again without hunting for the blue dot.
  const onRecenter = () => {
    if (!userCoords) return;
    setSelected(null);
    mapRef.current?.animateToRegion(
      { ...userCoords, latitudeDelta: DEFAULT_DELTA, longitudeDelta: DEFAULT_DELTA },
      400
    );
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
            // react-native-maps fires the map's own onPress for a marker tap
            // too (not just a genuine background tap) — without this guard,
            // tapping a pin would set `selected` to that mosque and then
            // immediately clear it again in the same gesture, which is
            // exactly why direct pin taps never opened the detail card while
            // "أقرب مسجد مني" (which never touches this handler) always did.
            onPress={(e) => {
              if (e.nativeEvent.action !== 'marker-press') setSelected(null);
            }}
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
            <>
              <Bounce style={[styles.addBtn, { bottom: bottomClearance }]} onPress={() => setSelected({ __addFlow: true })}>
                <Ionicons name="add" size={26} color={colors.white} />
              </Bounce>
              <Bounce style={[styles.recenterBtn, { bottom: bottomClearance }]} onPress={onRecenter}>
                <Ionicons name="navigate-outline" size={20} color={colors.ink} />
              </Bounce>
            </>
          ) : null}

          {selected?.__addFlow ? (
            <AddMosqueCard
              coords={userCoords}
              colors={colors}
              styles={styles}
              bottomClearance={bottomClearance}
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
            <View style={[styles.detailCard, { bottom: bottomClearance }]}>
              <View style={{ flex: 1 }}>
                <AppText weight="bold" size={15}>
                  {selected.name}
                  {selected.city ? ` - ${selected.city}` : ''}
                </AppText>
                {selected.distance != null || selected.source === 'osm' ? (
                  <AppText size={11} color={colors.inkFaint} style={{ marginTop: 2 }}>
                    {[
                      selected.distance != null ? `يبعد عنك ${formatDistance(selected.distance)}` : null,
                      selected.source === 'osm' ? 'من خرائط OpenStreetMap' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
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
function AddMosqueCard({ coords, colors, styles, bottomClearance, onClose, onCreated, onSuggestion }) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // A manual keyboard listener driving a translateY, not KeyboardAvoidingView
  // — KeyboardAvoidingView wraps its child in its own measuring container,
  // which was quietly overriding this card's row-reverse layout (the
  // buttons stretched into their own rows instead of sitting beside the
  // input) even with the keyboard closed. This keeps the card's resting
  // layout identical to a plain View and only shifts it once a keyboard is
  // actually on screen.
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const animateTo = (value, duration) =>
      Animated.timing(translateY, { toValue: value, duration: duration || 220, useNativeDriver: true }).start();
    const showSub = Keyboard.addListener(showEvent, (e) => {
      const shift = Math.max(0, (e.endCoordinates?.height || 0) - spacing.xl);
      animateTo(-shift, e.duration);
    });
    const hideSub = Keyboard.addListener(hideEvent, (e) => animateTo(0, e?.duration));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [translateY]);

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
    <Animated.View style={[styles.detailCard, { bottom: bottomClearance, transform: [{ translateY }] }]}>
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
    </Animated.View>
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
    recenterBtn: {
      position: 'absolute',
      bottom: spacing.xl,
      right: spacing.lg,
      width: 48,
      height: 48,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
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
