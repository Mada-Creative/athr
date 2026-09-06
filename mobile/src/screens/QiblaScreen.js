import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import colors from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

const KAABA = { latitude: 21.4225, longitude: 39.8262 };

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

export default function QiblaScreen() {
  const [qiblaBearing, setQiblaBearing] = useState(null);
  const [heading, setHeading] = useState(0);
  const [error, setError] = useState(null);
  const rotation = useState(new Animated.Value(0))[0];

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

  useEffect(() => {
    Magnetometer.setUpdateInterval(150);
    const sub = Magnetometer.addListener((data) => {
      let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
      angle = (angle + 360) % 360;
      setHeading(angle);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (qiblaBearing == null) return;
    const target = (qiblaBearing - heading + 360) % 360;
    Animated.timing(rotation, { toValue: target, duration: 150, useNativeDriver: true }).start();
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
          <View style={styles.compassRing}>
            <Animated.View style={[styles.arrow, { transform: [{ rotate }] }]}>
              <Ionicons name="navigate" size={64} color={colors.amber} />
            </Animated.View>
          </View>
          <AppText size={13} color={colors.inkSoft} style={{ marginTop: spacing.xl }}>
            {qiblaBearing != null ? `اتجاه القبلة: ${Math.round(qiblaBearing)}°` : 'جارٍ تحديد الاتجاه...'}
          </AppText>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  arrow: { alignItems: 'center', justifyContent: 'center' },
});
