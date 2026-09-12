import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import AthkarCountRing from '../components/AthkarCountRing';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import typography from '../theme/typography';
import { api } from '../api/client';
import { todayISO } from '../utils/date';
import athkarContent from '../constants/athkarContent';
import ATHKAR_META from '../constants/athkarMeta';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
const SWIPE_THRESHOLD = 90;
const VELOCITY_THRESHOLD = 800;
const DIR_LOCK = 10;

// One dhikr, full-screen, one at a time — swipe right for the next, left
// for the previous, tap the ring to count. Replaces the old scrolling list
// of cards with the same swipeable-card model the rest of "بطاقات أثر" will
// eventually share.
export default function AthkarCounterScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { category } = route.params;
  const meta = ATHKAR_META[category];
  const definition = athkarContent[category];
  const items = definition.items;
  const date = todayISO();

  useEffect(() => {
    navigation.setOptions({ title: meta.title });
  }, [navigation, meta.title]);

  const [counts, setCounts] = useState(() => items.map(() => 0));
  // Reading order — a list of item indices, computed once the real
  // progress loads (see below): whatever's left unread comes first, and
  // anything already fully read moves to the end instead of greeting you
  // again at the top. `pos` is a position *within this order*, never a raw
  // item index — `order[pos]` is the one to look up in `items`/`counts`.
  const [order, setOrder] = useState(() => items.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [previewDir, setPreviewDir] = useState(null); // 'next' | 'prev' | null
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/athkar/${date}`);
        const progress = res.categories?.[category];
        const loaded = progress?.completedItems?.length
          ? items.map((item, idx) => (progress.completedItems.includes(idx) ? item.repeat : 0))
          : items.map(() => 0);
        setCounts(loaded);
        const unread = [];
        const read = [];
        items.forEach((item, idx) => (loaded[idx] >= item.repeat ? read : unread).push(idx));
        setOrder([...unread, ...read]);
      } catch (err) {
        // no network — counter still works locally for this session, in
        // the category's natural order (the default `order` above)
      }
    })();
    // Only ever meant to run once per category, on mount — `items` is a
    // stable module-level array for a given category.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, date]);

  const syncItem = useCallback(
    async (itemIndex, wasComplete, isNowComplete) => {
      if (wasComplete === isNowComplete) return;
      try {
        await api.patch(`/athkar/${date}/${category}`, { itemIndex });
      } catch (err) {
        // will resync next time the screen loads with network back
      }
    },
    [date, category]
  );

  const onRingPress = useCallback(
    (itemIndex) => {
      const target = items[itemIndex].repeat;
      setCounts((prev) => {
        const wasComplete = prev[itemIndex] >= target;
        const nextValue = wasComplete ? 0 : prev[itemIndex] + 1;
        const isNowComplete = nextValue >= target;
        const next = prev.slice();
        next[itemIndex] = nextValue;
        syncItem(itemIndex, wasComplete, isNowComplete);
        return next;
      });
      try {
        Haptics.selectionAsync();
      } catch (err) {
        // haptics unavailable on this platform — ignore
      }
    },
    [items, syncItem]
  );

  // ---------- swipe mechanics ----------
  const translateX = useRef(new Animated.Value(0)).current;
  const dirLockedRef = useRef(false);

  const neighborPos = useCallback((dir) => (dir === 'next' ? (pos + 1) % order.length : (pos - 1 + order.length) % order.length), [pos, order.length]);

  const commitTo = useCallback(
    (dir) => {
      if (transitioning) return;
      setTransitioning(true);
      setPreviewDir(dir);
      const exitTo = dir === 'next' ? SCREEN_WIDTH * 1.3 : -SCREEN_WIDTH * 1.3;
      // Rotation is derived from translateX via interpolation (frontRotate
      // below), so animating just this one value carries both along together.
      Animated.timing(translateX, { toValue: exitTo, duration: 240, useNativeDriver: true }).start();
      setTimeout(() => {
        setPos((p) => (dir === 'next' ? (p + 1) % order.length : (p - 1 + order.length) % order.length));
        translateX.setValue(0);
        setPreviewDir(null);
        dirLockedRef.current = false;
        setTransitioning(false);
      }, 250);
    },
    [transitioning, translateX, order.length]
  );

  const springBack = useCallback(() => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 6 }).start(() => {
      setPreviewDir(null);
      dirLockedRef.current = false;
    });
  }, [translateX]);

  // Modern Gesture.Pan() API rather than the old PanGestureHandler +
  // onGestureEvent/onHandlerStateChange pair — that old API silently never
  // recognized the gesture at all on a real device with this project's
  // actual RN/gesture-handler versions (card wouldn't budge, no animation,
  // exactly as if no swipe had happened), same symptom on AthrCardScreen
  // and this screen alike despite one being a modal and the other not, so
  // it was never a modal-vs-card issue — it was this API itself. translateX
  // stays a plain Animated.Value (no Reanimated in this project); onUpdate/
  // onEnd run on the JS thread without needing Reanimated's worklets.
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
            // released before the direction ever locked in (a near-tap
            // that still nudged the pan a little) — snap back to exactly
            // 0 rather than leaving a few stray pixels of offset.
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

  const onRingComplete = useCallback(() => {
    setTimeout(() => commitTo('next'), 650);
  }, [commitTo]);

  const itemIndex = order[pos];
  const frontItem = items[itemIndex];
  const backItemIndex = previewDir ? order[neighborPos(previewDir)] : null;
  const backItem = backItemIndex != null ? items[backItemIndex] : null;

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
        {pos + 1} من {items.length}
      </AppText>

      <View style={styles.dotsRow}>
        {items.map((it, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === itemIndex && styles.dotCurrent,
              i !== itemIndex && counts[i] >= it.repeat && styles.dotDone,
            ]}
          />
        ))}
      </View>

      <View style={styles.stage}>
        {backItem ? (
          <Animated.View
            style={[
              styles.card,
              styles.cardBack,
              { transform: [{ translateX: backTranslateX }, { scale: backScale }], opacity: backOpacity },
            ]}
            pointerEvents="none"
          >
            <CardBody item={backItem} count={counts[backItemIndex]} meta={meta} colors={colors} styles={styles} onPress={() => {}} />
          </Animated.View>
        ) : null}

        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.card, styles.cardFront, { transform: [{ translateX }, { rotate: frontRotate }] }]}>
            <CardBody
              item={frontItem}
              count={counts[itemIndex]}
              meta={meta}
              colors={colors}
              styles={styles}
              onPress={() => onRingPress(itemIndex)}
              onComplete={onRingComplete}
            />
          </Animated.View>
        </GestureDetector>
      </View>

      <AppText size={11} color={colors.inkFaint} style={styles.swipeHint}>
        اسحب يمين للتالي، شمال للسابق
      </AppText>
    </Screen>
  );
}

function CardBody({ item, count, meta, colors, styles, onPress, onComplete }) {
  const done = count >= item.repeat;
  return (
    <>
      <View style={[styles.tag, { backgroundColor: `${meta.color}22` }]}>
        <AppText size={12} weight="bold" color={meta.color}>
          {item.label || meta.title}
        </AppText>
      </View>
      <View style={styles.textWrap}>
        <AppText size={20} color={colors.ink} style={styles.cardText}>
          {item.text}
        </AppText>
      </View>
      {item.source ? (
        <AppText size={11.5} color={colors.inkSoft} style={styles.source}>
          {item.source}
        </AppText>
      ) : null}
      <View style={styles.footer}>
        <AthkarCountRing count={count} target={item.repeat} onPress={onPress} onComplete={onComplete} />
        <AppText size={12} color={colors.inkFaint} style={{ marginTop: spacing.sm }}>
          {done ? 'أحسنت — بننتقل تلقائيًا' : 'اضغط للعدّ'}
        </AppText>
      </View>
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
    dotDone: { backgroundColor: colors.sage },
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
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
    },
    textWrap: { flex: 1, justifyContent: 'center', marginTop: spacing.lg },
    cardText: { textAlign: 'center', lineHeight: 34, fontFamily: typography.fontDhikr },
    source: { textAlign: 'center', marginTop: spacing.sm },
    footer: { alignItems: 'center', marginTop: spacing.lg },
    swipeHint: { textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xs },
  });
}
