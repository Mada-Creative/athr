import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';

const KAABA = { latitude: 21.4225, longitude: 39.8262 };

// Within this many degrees of the exact bearing counts as "facing qibla" —
// tight enough to mean something, loose enough for a handheld compass
// (which never sits perfectly still) to actually settle inside it instead
// of flickering in and out every frame.
const ALIGNMENT_THRESHOLD_DEG = 6;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}
function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

function bearingTo(from, to) {
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Smallest angular difference between two compass bearings — a plain
// subtraction would call 359° vs 1° a 358° difference instead of the real
// 2°, since bearings wrap around at 360°.
function angularDiff(a, b) {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export default function QiblaScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [qiblaBearing, setQiblaBearing] = useState(null);
  const [heading, setHeading] = useState(0);
  const [error, setError] = useState(null);
  const [isAligned, setIsAligned] = useState(false);
  const rotation = useState(new Animated.Value(0))[0];
  const wasAlignedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('يلزم إذن الموقع لتحديد اتجاه القبلة بدقة');
          return;
        }
        const position = await Location.getCurrentPositionAsync({});
        const bearing = bearingTo(
          { latitude: position.coords.latitude, longitude: position.coords.longitude },
          KAABA
        );
        setQiblaBearing(bearing);
      } catch (err) {
        setError('تعذر تحديد الموقع الحالي');
      }
    })();
  }, []);

  // The device's own compass heading — tilt-compensated and calibrated by
  // the OS — instead of computing one ourselves from the magnetometer's raw
  // x/y field readings, which only reads correctly when the phone is held
  // perfectly flat and was the actual source of the reported inaccuracy.
  useEffect(() => {
    let subscription;
    let cancelled = false;
    (async () => {
      subscription = await Location.watchHeadingAsync((data) => {
        if (cancelled) return;
        // trueHeading is -1 when the device can't derive it yet (no fix,
        // still calibrating) — magHeading is always available as a fallback.
        setHeading(data.trueHeading >= 0 ? data.trueHeading : data.magHeading);
      });
    })();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    if (qiblaBearing == null) return;
    const target = (qiblaBearing - heading + 360) % 360;
    Animated.timing(rotation, { toValue: target, duration: 150, useNativeDriver: true }).start();

    const aligned = angularDiff(qiblaBearing, heading) <= ALIGNMENT_THRESHOLD_DEG;
    setIsAligned(aligned);
    // Only fire the instant alignment happens, not on every reading while
    // it holds — repeating a haptic every 150ms would just buzz constantly.
    if (aligned && !wasAlignedRef.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    wasAlignedRef.current = aligned;
  }, [qiblaBearing, heading, rotation]);

  const rotate = rotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });

  return (
    <Screen contentStyle={styles.content}>
      <AppText weight="bold" size={22}>
        اتجاه القبلة
      </AppText>
      <AppText color={colors.inkSoft} size={13.5} style={{ marginTop: 4, marginBottom: spacing.xxl, textAlign: 'center' }}>
        وجّه الجزء العلوي من الهاتف نحو السهم حتى يستقر على الكعبة
      </AppText>

      {error ? (
        <AppText color={colors.clay} size={14} style={{ textAlign: 'center' }}>
          {error}
        </AppText>
      ) : (
        <View style={styles.compassWrap}>
          <View style={[styles.compassRing, isAligned && styles.compassRingAligned]}>
            <Animated.View style={[styles.arrow, { transform: [{ rotate }] }]}>
              <Ionicons name="navigate" size={64} color={isAligned ? colors.sage : colors.amber} />
            </Animated.View>
          </View>
          {isAligned ? (
            <View style={styles.alignedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.sage} />
              <AppText size={13} weight="bold" color={colors.sage} style={{ marginRight: 4 }}>
                أنت متّجه نحو القبلة الآن
              </AppText>
            </View>
          ) : (
            <AppText size={13} color={colors.inkSoft} style={{ marginTop: spacing.xl }}>
              {qiblaBearing != null ? `اتجاه القبلة: ${Math.round(qiblaBearing)}°` : 'جارٍ تحديد الاتجاه...'}
            </AppText>
          )}
        </View>
      )}
    </Screen>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    content: { flexGrow: 1, alignItems: 'center', paddingTop: spacing.xxl },
    compassWrap: { alignItems: 'center' },
    compassRing: {
      width: 220,
      height: 220,
      borderRadius: radius.pill,
      borderWidth: 3,
      borderColor: colors.amberSoft,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    compassRingAligned: { borderColor: colors.sage, backgroundColor: colors.sageSoft },
    arrow: { alignItems: 'center', justifyContent: 'center' },
    alignedBadge: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      marginTop: spacing.xl,
    },
  });
}
