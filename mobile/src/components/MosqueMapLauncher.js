import React, { useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Bounce from './Bounce';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import MosqueMapScreen from '../screens/MosqueMapScreen';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const FAB_SIZE = 56;
// How big the reveal circle needs to grow to fully cover the screen from
// any corner it might start at — the screen's own diagonal, plus a little
// slack so the very edge doesn't show an unmasked sliver.
const MAX_RADIUS = Math.hypot(SCREEN_W, SCREEN_H) + 40;

// A floating "خريطة المساجد" entry point that lives on Home permanently
// (stays fixed through scrolling — see Screen.js's `overlay` prop) and
// opens the map by having the button's own circle grow to cover the
// screen, instead of a normal push transition. MaskedView is what makes
// that possible in React Native — there's no CSS clip-path equivalent, but
// a masked view only shows through wherever its mask is opaque, so
// animating an opaque circle's radius from 0 to fullscreen reveals the map
// exactly like the circle is "opening up" from the button itself.
export default function MosqueMapLauncher() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const fabHostRef = useRef(null);
  const [open, setOpen] = useState(false);
  // Kept mounted slightly past `open` turning false, so the closing
  // animation has something to shrink away instead of the map vanishing
  // the instant the close button is tapped.
  const [mounted, setMounted] = useState(false);
  // The FAB's real on-screen center, measured fresh each time it's opened
  // (measureInWindow, not a precomputed constant) — the button's exact
  // position shifts with the device's safe-area insets (home indicator,
  // notch), and the circle has to originate from precisely where the
  // button actually is or the reveal reads as detached from it.
  const [origin, setOrigin] = useState(null);
  const radiusAnim = useRef(new Animated.Value(0)).current;
  const fabOpacity = useRef(new Animated.Value(1)).current;

  const openMap = () => {
    fabHostRef.current?.measureInWindow((x, y, width, height) => {
      setOrigin({ x: x + width / 2, y: y + height / 2 });
      setMounted(true);
      setOpen(true);
      radiusAnim.setValue(0);
      Animated.timing(fabOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      // width/height/top/left/borderRadius are all layout properties, which
      // the native driver can't animate — this node stays JS-driven.
      Animated.timing(radiusAnim, { toValue: MAX_RADIUS, duration: 550, useNativeDriver: false }).start();
    });
  };

  const closeMap = () => {
    setOpen(false);
    Animated.timing(radiusAnim, { toValue: 0, duration: 450, useNativeDriver: false }).start(() => {
      setMounted(false);
    });
    Animated.timing(fabOpacity, { toValue: 1, duration: 250, delay: 150, useNativeDriver: true }).start();
  };

  const diameter = Animated.multiply(radiusAnim, 2);
  const maskStyle = origin && {
    position: 'absolute',
    width: diameter,
    height: diameter,
    borderRadius: radiusAnim,
    left: Animated.subtract(origin.x, radiusAnim),
    top: Animated.subtract(origin.y, radiusAnim),
    backgroundColor: '#000',
  };

  return (
    <>
      {mounted && maskStyle ? (
        <View style={StyleSheet.absoluteFill} pointerEvents={open ? 'auto' : 'none'}>
          <MaskedView
            style={StyleSheet.absoluteFill}
            maskElement={
              <View style={styles.maskHost}>
                <Animated.View style={maskStyle} />
              </View>
            }
          >
            <MosqueMapScreen onRequestClose={closeMap} />
          </MaskedView>
        </View>
      ) : null}

      <SafeAreaView edges={['bottom', 'right']} style={styles.fabSafeWrap} pointerEvents="box-none">
        <Animated.View ref={fabHostRef} collapsable={false} style={{ opacity: fabOpacity }} pointerEvents={open ? 'none' : 'auto'}>
          <Bounce style={styles.fab} onPress={openMap}>
            <Ionicons name="map-outline" size={24} color={colors.white} />
          </Bounce>
        </Animated.View>
      </SafeAreaView>
    </>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    maskHost: { flex: 1, backgroundColor: 'transparent' },
    fabSafeWrap: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      padding: spacing.lg,
      alignItems: 'flex-end',
    },
    fab: {
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: radius.pill,
      backgroundColor: colors.amberDeep,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 6,
    },
  });
}
