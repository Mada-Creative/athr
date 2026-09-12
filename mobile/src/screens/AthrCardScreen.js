import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Share, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import Bounce from '../components/Bounce';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import typography from '../theme/typography';
import ATHR_CARDS, { cardIndexForDate, isHadithSourced, HADITH_PREFIX } from '../constants/athrCards';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
const SWIPE_THRESHOLD = 90;
const VELOCITY_THRESHOLD = 800;
const DIR_LOCK = 10;

// Full-screen "بطاقات أثر" reader — opens on today's card, swipe right/left
// (same gesture as AthkarCounterScreen) to browse back and forward through
// the whole cycle. No counter/ring here, just the card.
export default function AthrCardScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const todayIndex = useMemo(() => cardIndexForDate(new Date()), []);
  const [pos, setPos] = useState(todayIndex);
  const [previewDir, setPreviewDir] = useState(null);
  const [transitioning, setTransitioning] = useState(false);

  const translateX = useRef(new Animated.Value(0)).current;
  const dirLockedRef = useRef(false);

  const neighborPos = useCallback(
    (dir) => (dir === 'next' ? (pos + 1) % ATHR_CARDS.length : (pos - 1 + ATHR_CARDS.length) % ATHR_CARDS.length),
    [pos]
  );

  const commitTo = useCallback(
    (dir) => {
      if (transitioning) return;
      setTransitioning(true);
      setPreviewDir(dir);
      const exitTo = dir === 'next' ? SCREEN_WIDTH * 1.3 : -SCREEN_WIDTH * 1.3;
      Animated.timing(translateX, { toValue: exitTo, duration: 240, useNativeDriver: true }).start();
      setTimeout(() => {
        setPos((p) => (dir === 'next' ? (p + 1) % ATHR_CARDS.length : (p - 1 + ATHR_CARDS.length) % ATHR_CARDS.length));
        translateX.setValue(0);
        setPreviewDir(null);
        dirLockedRef.current = false;
        setTransitioning(false);
      }, 250);
    },
    [transitioning, translateX]
  );

  const springBack = useCallback(() => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 6 }).start(() => {
      setPreviewDir(null);
      dirLockedRef.current = false;
    });
  }, [translateX]);

  // Modern Gesture.Pan() API rather than the old PanGestureHandler +
  // onGestureEvent/onHandlerStateChange component pair — the old API is
  // what this screen (and AthkarCounterScreen/DuasScreen, same code)
  // shipped with originally, and on this project's actual RN/gesture-
  // handler versions it turned out to not even recognize the gesture at
  // all on a real device (card wouldn't budge, no animation, exactly as
  // if no swipe had happened) — not a modal-vs-card thing, since
  // AthkarCounterScreen isn't a modal and had the identical symptom. This
  // is gesture-handler's own currently-recommended way to build a pan
  // gesture; translateX stays a plain Animated.Value (no Reanimated in
  // this project) and gets updated from the JS thread in onUpdate/onEnd,
  // which doesn't need Reanimated's worklets to work.
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

  const frontCard = ATHR_CARDS[pos];
  const backIndex = previewDir ? neighborPos(previewDir) : null;
  const backCard = backIndex != null ? ATHR_CARDS[backIndex] : null;

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

  const onShare = useCallback(async () => {
    const c = ATHR_CARDS[pos];
    try {
      await Share.share({
        message: `${c.text}\n\n— ${c.source}\n\nمن تطبيق أثر`,
      });
    } catch (err) {
      // user cancelled the share sheet or it failed silently — nothing to recover
    }
  }, [pos]);

  return (
    // GestureHandlerRootView here, not just App.js's top-level one — this
    // screen is presented as a native 'modal' (see RootNavigator.js), which
    // react-native-screens renders as its own separate native surface, not
    // a descendant of App.js's root view the way every plain 'card' screen
    // is. gesture-handler's PanGestureHandler only recognizes touches
    // inside a GestureHandlerRootView that actually covers the surface
    // it's rendered on — without this, App.js's root view doesn't reach in
    // here, so swipes were dead in both directions no matter what the
    // gesture thresholds or the modal's own dismiss-gesture setting were.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Screen scroll={false} contentStyle={{ flex: 1, paddingBottom: spacing.lg }}>
        <View style={styles.topRow}>
          <Bounce onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </Bounce>
        </View>

        <View style={styles.stage}>
          {backCard ? (
            <Animated.View
              style={[
                styles.card,
                styles.cardBack,
                { transform: [{ translateX: backTranslateX }, { scale: backScale }], opacity: backOpacity },
              ]}
              pointerEvents="none"
            >
              <CardBody card={backCard} isToday={backIndex === todayIndex} colors={colors} styles={styles} />
            </Animated.View>
          ) : null}

          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.card, styles.cardFront, { transform: [{ translateX }, { rotate: frontRotate }] }]}>
              <CardBody card={frontCard} isToday={pos === todayIndex} colors={colors} styles={styles} />
            </Animated.View>
          </GestureDetector>
        </View>

        <View style={styles.bottomRow}>
          <AppText size={10} color={colors.inkFaint}>
            اسحب يمين للتالي، شمال للسابق
          </AppText>
          <Bounce onPress={onShare} style={styles.shareBtn}>
            <Ionicons name="share-outline" size={15} color={colors.accentSoft} />
            <AppText weight="semibold" size={12.5} color={colors.accentSoft} style={{ marginRight: 5 }}>
              مشاركة
            </AppText>
          </Bounce>
        </View>
      </Screen>
    </GestureHandlerRootView>
  );
}

function CardBody({ card, isToday, colors, styles }) {
  return (
    <>
      <View style={styles.mark}>
        <Image source={require('../../assets/logo.png')} style={styles.markImg} resizeMode="cover" />
      </View>
      <View style={styles.tagRow}>
        <View style={styles.tag}>
          <AppText size={12} weight="bold" color={colors.amberDeep}>
            {card.tag}
          </AppText>
        </View>
        {isToday ? (
          <View style={styles.todayPill}>
            <AppText size={10.5} weight="bold" color={colors.sage}>
              بطاقة اليوم
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={styles.textWrap}>
        {isHadithSourced(card) ? (
          <AppText size={13.5} weight="semibold" color={colors.amberDeep} style={styles.hadithPrefix}>
            {HADITH_PREFIX}
          </AppText>
        ) : null}
        <AppText size={22} color={colors.ink} style={styles.cardText}>
          {card.text}
        </AppText>
      </View>
      <AppText size={11.5} color={colors.inkSoft} style={styles.source}>
        {card.source}
      </AppText>
    </>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    topRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
    closeBtn: {
      width: 38,
      height: 38,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
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
    mark: {
      position: 'absolute',
      top: spacing.lg,
      right: spacing.lg,
      width: 30,
      height: 30,
      borderRadius: radius.pill,
      overflow: 'hidden',
      backgroundColor: '#FAF5EC',
      borderWidth: 1,
      borderColor: colors.border,
    },
    markImg: { width: '100%', height: '100%' },
    tagRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.xs, alignSelf: 'center', marginTop: spacing.sm },
    tag: {
      borderRadius: radius.pill,
      backgroundColor: colors.amberSoft,
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
    },
    todayPill: {
      borderRadius: radius.pill,
      backgroundColor: colors.sageSoft,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
    },
    textWrap: { flex: 1, justifyContent: 'center', marginTop: spacing.lg },
    hadithPrefix: { textAlign: 'center', marginBottom: spacing.sm },
    cardText: { textAlign: 'center', lineHeight: 36, fontFamily: typography.fontDhikr },
    source: { textAlign: 'center', marginTop: spacing.sm },
    bottomRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
    shareBtn: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      backgroundColor: colors.accentDark,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
    },
  });
}
