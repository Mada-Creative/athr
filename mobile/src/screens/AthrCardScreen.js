import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Image, Modal, Share, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import Bounce from '../components/Bounce';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import typography from '../theme/typography';
import ATHR_CARDS, { cardIndexForDate, isHadithSourced, HADITH_PREFIX } from '../constants/athrCards';

// The image-share card is rendered at this fixed size regardless of the
// device's own screen width — captured at a high pixelRatio (see
// ViewShot options below) so the exported PNG is crisp on any phone that
// opens it, not just this one.
const SHARE_CARD_WIDTH = 320;
const SHARE_CARD_HEIGHT = 460;

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
      // The card swap used to run off a fixed setTimeout(250) guessed to be
      // "just after" this 240ms animation — close enough most of the time,
      // but on a slower frame or a dropped one, the timer could fire before
      // the exit animation had actually finished sliding the old card off
      // screen, so the new card's content swapped in while the old one was
      // still visibly mid-slide: a one-frame flash of the wrong text
      // overlapping the old card, which then "snapped" once translateX
      // reset — exactly the flicker reported. Using the animation's own
      // completion callback instead guarantees the swap only ever happens
      // once the old card is actually fully off screen, whatever the
      // device's real frame timing was.
      Animated.timing(translateX, { toValue: exitTo, duration: 240, useNativeDriver: true }).start(() => {
        setPos((p) => (dir === 'next' ? (p + 1) % ATHR_CARDS.length : (p - 1 + ATHR_CARDS.length) % ATHR_CARDS.length));
        translateX.setValue(0);
        setPreviewDir(null);
        dirLockedRef.current = false;
        setTransitioning(false);
      });
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

  const [shareMenuVisible, setShareMenuVisible] = useState(false);
  const [sharingImage, setSharingImage] = useState(false);
  const shareViewRef = useRef(null);

  const onShareText = useCallback(async () => {
    setShareMenuVisible(false);
    const c = ATHR_CARDS[pos];
    try {
      await Share.share({
        message: `${c.text}\n\n— ${c.source}\n\nمن تطبيق أثر`,
      });
    } catch (err) {
      // user cancelled the share sheet or it failed silently — nothing to recover
    }
  }, [pos]);

  // Captures the off-screen ShareableCard (below) — not this screen's own
  // reading card — into a PNG and hands it to the system share sheet.
  // Needs a real native module (react-native-view-shot) that Expo Go
  // doesn't ship, so this only actually works from a development build.
  const onShareImage = useCallback(async () => {
    setShareMenuVisible(false);
    setSharingImage(true);
    try {
      const uri = await shareViewRef.current.capture();
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'مشاركة بطاقة أثر' });
      } else {
        // No native share sheet available on this device/build — fall back
        // to the text share rather than silently doing nothing.
        await onShareText();
      }
    } catch (err) {
      // capture failed (e.g. running in Expo Go, where the native module
      // this needs isn't present) or the user dismissed the share sheet —
      // either way there's nothing to recover, just don't leave the
      // spinner stuck.
    } finally {
      setSharingImage(false);
    }
  }, [onShareText]);

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
          <Bounce onPress={() => setShareMenuVisible(true)} style={styles.shareBtn}>
            <Ionicons name="share-outline" size={15} color={colors.accentSoft} />
            <AppText weight="semibold" size={12.5} color={colors.accentSoft} style={{ marginRight: 5 }}>
              مشاركة
            </AppText>
          </Bounce>
        </View>
      </Screen>

      {/* Off-screen, never shown to the user directly — ViewShot needs a
          real laid-out view to capture, so this renders at a fixed pixel
          size (not a percentage — see this app's own established lesson
          on why absolute+percentage positioning misbehaves here) parked
          far outside the visible screen instead of somewhere with zero
          size, which risks not laying out its children at all. */}
      <View style={styles.offscreen} pointerEvents="none">
        <ViewShot ref={shareViewRef} options={{ format: 'png', quality: 1, result: 'tmpfile' }}>
          <ShareableCard card={frontCard} colors={colors} styles={styles} />
        </ViewShot>
      </View>

      <ShareMenu
        visible={shareMenuVisible}
        loading={sharingImage}
        colors={colors}
        onShareImage={onShareImage}
        onShareText={onShareText}
        onClose={() => setShareMenuVisible(false)}
      />
    </GestureHandlerRootView>
  );
}

function ShareableCard({ card, colors, styles }) {
  return (
    <LinearGradient colors={[colors.amber, colors.gold]} style={styles.shareBg}>
      <View style={styles.shareLogoRow}>
        <View style={styles.shareLogoWrap}>
          <Image source={require('../../assets/logo.png')} style={styles.markImg} resizeMode="cover" />
        </View>
        <AppText weight="bold" size={17} color={colors.white}>
          أثر
        </AppText>
      </View>

      <View style={styles.shareCard}>
        <View style={styles.tag}>
          <AppText size={12} weight="bold" color={colors.amberDeep}>
            {card.tag}
          </AppText>
        </View>
        {isHadithSourced(card) ? (
          <AppText size={12.5} weight="semibold" color={colors.amberDeep} style={styles.hadithPrefix}>
            {HADITH_PREFIX}
          </AppText>
        ) : null}
        <AppText size={17} color={colors.ink} style={[styles.cardText, { marginTop: spacing.sm }]}>
          {card.text}
        </AppText>
        <AppText size={11} color={colors.inkSoft} style={styles.source}>
          {card.source}
        </AppText>
      </View>

      <AppText weight="bold" size={13.5} color={colors.white} style={{ marginTop: spacing.lg }}>
        حمّل تطبيق أثر 🌙
      </AppText>
    </LinearGradient>
  );
}

function ShareMenu({ visible, loading, colors, onShareImage, onShareText, onClose }) {
  const styles = createMenuStyles(colors);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Bounce onPress={onClose} style={styles.backdrop} scaleTo={1}>
        <View />
      </Bounce>
      <View style={styles.sheet}>
        <AppText weight="bold" size={15} style={{ textAlign: 'center', marginBottom: spacing.md }}>
          مشاركة البطاقة
        </AppText>
        <Bounce onPress={onShareImage} disabled={loading} style={styles.option}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.amberDeep} />
          ) : (
            <Ionicons name="image-outline" size={19} color={colors.amberDeep} />
          )}
          <View style={{ flex: 1 }}>
            <AppText weight="semibold" size={14}>
              كصورة
            </AppText>
            <AppText size={11.5} color={colors.inkSoft}>
              بطاقة جاهزة للمشاركة بأي مكان
            </AppText>
          </View>
        </Bounce>
        <Bounce onPress={onShareText} style={styles.option}>
          <Ionicons name="text-outline" size={19} color={colors.clay} />
          <View style={{ flex: 1 }}>
            <AppText weight="semibold" size={14}>
              كنص
            </AppText>
            <AppText size={11.5} color={colors.inkSoft}>
              نص البطاقة والمصدر فقط
            </AppText>
          </View>
        </Bounce>
        <Bounce onPress={onClose} style={styles.cancelBtn}>
          <AppText weight="semibold" size={14} color={colors.inkSoft}>
            إلغاء
          </AppText>
        </Bounce>
      </View>
    </Modal>
  );
}

function createMenuStyles(colors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
    },
    option: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cancelBtn: { alignItems: 'center', marginTop: spacing.sm, paddingVertical: spacing.sm },
  });
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
    // Fixed pixel offset, not a percentage — parked far outside the
    // visible screen for ViewShot to capture without ever being seen.
    offscreen: { position: 'absolute', top: -4000, left: 0 },
    shareBg: {
      width: SHARE_CARD_WIDTH,
      height: SHARE_CARD_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    shareLogoRow: {
      position: 'absolute',
      top: spacing.lg,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: spacing.sm,
    },
    shareLogoWrap: {
      width: 30,
      height: 30,
      borderRadius: radius.pill,
      overflow: 'hidden',
      backgroundColor: '#FAF5EC',
    },
    // The actual card, floating on the gradient background rather than
    // filling it edge to edge — this is the "stays looking like a card,
    // away from the frame's own edges" look asked for, since the whole
    // point is this image gets shared standalone outside the app.
    shareCard: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      alignItems: 'center',
    },
  });
}
