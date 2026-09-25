import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import typography from '../theme/typography';
import duas from '../constants/duas';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
const SWIPE_THRESHOLD = 90;
const VELOCITY_THRESHOLD = 800;
const DIR_LOCK = 10;

// A first pass at the same swipeable-card model as AthkarCounterScreen —
// one dua at a time, swipe right for the next, left for the previous — just
// without a counter/ring, since a dua isn't something to tally. If it reads
// well, more of the app's browsing screens move to this same card shape.
export default function DuasScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [pos, setPos] = useState(0);
  const [previewDir, setPreviewDir] = useState(null); // 'next' | 'prev' | null
  const [transitioning, setTransitioning] = useState(false);

  const translateX = useRef(new Animated.Value(0)).current;
  const dirLockedRef = useRef(false);

  const neighborPos = useCallback(
    (dir) => (dir === 'next' ? (pos + 1) % duas.length : (pos - 1 + duas.length) % duas.length),
    [pos]
  );

  const commitTo = useCallback(
    (dir) => {
      if (transitioning) return;
      setTransitioning(true);
      setPreviewDir(dir);
      const exitTo = dir === 'next' ? SCREEN_WIDTH * 1.3 : -SCREEN_WIDTH * 1.3;
      // The card swap used to run off a fixed setTimeout(250) guessed to be
      // "just after" this 240ms animation — on a slower/dropped frame, the
      // timer could fire before the exit animation actually finished, so
      // the new card's content swapped in while the old one was still
      // visibly mid-slide: a one-frame flash of the wrong text, then a
      // "snap" once translateX reset. The animation's own completion
      // callback guarantees the swap only happens once the old card is
      // actually fully off screen.
      //
      // That alone didn't fully clear the flicker, though — this same
      // translateX is also set directly from JS every drag frame (see
      // panGesture's onUpdate below), and a native-driven .timing() mixed
      // with plain JS .setValue() calls on the same Animated.Value is its
      // own known source of native/JS state briefly disagreeing.
      // useNativeDriver:false here keeps this value JS-driven end to end,
      // matching how the gesture already updates it.
      Animated.timing(translateX, { toValue: exitTo, duration: 240, useNativeDriver: false }).start(() => {
        setPos((p) => (dir === 'next' ? (p + 1) % duas.length : (p - 1 + duas.length) % duas.length));
        translateX.setValue(0);
        setPreviewDir(null);
        dirLockedRef.current = false;
        setTransitioning(false);
      });
    },
    [transitioning, translateX]
  );

  const springBack = useCallback(() => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: false, speed: 20, bounciness: 6 }).start(() => {
      setPreviewDir(null);
      dirLockedRef.current = false;
    });
  }, [translateX]);

  // Modern Gesture.Pan() API rather than the old PanGestureHandler +
  // onGestureEvent/onHandlerStateChange pair — that old API silently never
  // recognized the gesture at all on a real device with this project's
  // actual RN/gesture-handler versions (AthrCardScreen/AthkarCounterScreen,
  // same code, had the identical symptom despite one being a modal and the
  // other not, so it was never a modal-vs-card issue). translateX stays a
  // plain Animated.Value (no Reanimated in this project); onUpdate/onEnd
  // run on the JS thread without needing Reanimated's worklets.
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-DIR_LOCK, DIR_LOCK])
        .failOffsetY([-24, 24])
        .enabled(!transitioning)
        .onUpdate((e) => {
          translateX.setValue(e.translationX);
          if (!dirLockedRef.current && Math.abs(e.translationX) > DIR_LOCK) {
            dirLockedRef.current = true;
            setPreviewDir(e.translationX > 0 ? 'next' : 'prev');
          }
        })
        .onEnd((e) => {
          if (!dirLockedRef.current) {
            translateX.setValue(0);
            return;
          }
          const passedThreshold = Math.abs(e.translationX) > SWIPE_THRESHOLD || Math.abs(e.velocityX) > VELOCITY_THRESHOLD;
          if (passedThreshold) {
            commitTo(e.translationX >= 0 ? 'next' : 'prev');
          } else {
            springBack();
          }
        }),
    [transitioning, commitTo, springBack, translateX]
  );

  const frontDua = duas[pos];
  const backDuaIndex = previewDir ? neighborPos(previewDir) : null;
  const backDua = backDuaIndex != null ? duas[backDuaIndex] : null;

  const frontRotate = translateX.interpolate({
    inputRange: [-CARD_WIDTH, 0, CARD_WIDTH],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const backInputRange = previewDir === 'next' ? [0, CARD_WIDTH] : [-CARD_WIDTH, 0];
  const backTranslateX = previewDir
    ? translateX.interpolate({
        inputRange: backInputRange,
        outputRange: previewDir === 'next' ? [-CARD_WIDTH * 0.34, 0] : [0, CARD_WIDTH * 0.34],
        extrapolate: 'clamp',
      })
    : 0;
  const backScale = previewDir
    ? translateX.interpolate({
        inputRange: backInputRange,
        outputRange: previewDir === 'next' ? [0.93, 1] : [1, 0.93],
        extrapolate: 'clamp',
      })
    : 1;
  const backOpacity = previewDir
    ? translateX.interpolate({
        inputRange: backInputRange,
        outputRange: previewDir === 'next' ? [0.55, 1] : [1, 0.55],
        extrapolate: 'clamp',
      })
    : 0;

  return (
    <Screen scroll={false} contentStyle={{ flex: 1, paddingBottom: spacing.lg }}>
      <AppText size={12.5} color={colors.inkFaint} style={styles.posLabel}>
        {pos + 1} من {duas.length}
      </AppText>

      <View style={styles.dotsRow}>
        {duas.map((_, i) => (
          <View key={i} style={[styles.dot, i === pos && styles.dotCurrent]} />
        ))}
      </View>

      <View style={styles.stage}>
        {backDua ? (
          <Animated.View
            style={[
              styles.card,
              styles.cardBack,
              { transform: [{ translateX: backTranslateX }, { scale: backScale }], opacity: backOpacity },
            ]}
            pointerEvents="none"
          >
            <CardBody dua={backDua} colors={colors} styles={styles} />
          </Animated.View>
        ) : null}

        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.card, styles.cardFront, { transform: [{ translateX }, { rotate: frontRotate }] }]}>
            <CardBody dua={frontDua} colors={colors} styles={styles} />
          </Animated.View>
        </GestureDetector>
      </View>

      <AppText size={11} color={colors.inkFaint} style={styles.swipeHint}>
        اسحب يمين للتالي، شمال للسابق
      </AppText>
    </Screen>
  );
}

function CardBody({ dua, colors, styles }) {
  return (
    <>
      <View style={styles.tag}>
        <AppText size={12} weight="bold" color={colors.amberDeep}>
          {dua.title}
        </AppText>
      </View>
      <View style={styles.textWrap}>
        <AppText size={21} color={colors.ink} style={styles.cardText}>
          {dua.text}
        </AppText>
      </View>
      <AppText size={11.5} color={colors.inkSoft} style={styles.source}>
        {dua.source}
      </AppText>
    </>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    posLabel: { textAlign: 'center', marginTop: spacing.xs, fontVariant: ['tabular-nums'] },
    dotsRow: {
      flexDirection: 'row-reverse',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    dot: { width: 6, height: 6, borderRadius: radius.pill, backgroundColor: colors.border },
    dotCurrent: { width: 18, borderRadius: 4, backgroundColor: colors.amber },
    stage: { flex: 1, position: 'relative' },
    card: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.xl,
      shadowColor: colors.shadow,
      shadowOpacity: 1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    cardFront: { zIndex: 2 },
    cardBack: { zIndex: 1 },
    tag: {
      alignSelf: 'center',
      borderRadius: radius.pill,
      backgroundColor: colors.amberSoft,
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
    },
    textWrap: { flex: 1, justifyContent: 'center', marginTop: spacing.lg },
    cardText: { textAlign: 'center', lineHeight: 36, fontFamily: typography.fontDhikr },
    source: { textAlign: 'center', marginTop: spacing.sm },
    swipeHint: { textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xs },
  });
}
