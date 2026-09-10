import React, { useCallback, useEffect, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Screen from '../components/Screen';
import AppText from '../components/AppText';
import Card from '../components/Card';
import PopIcon from '../components/PopIcon';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import { api } from '../api/client';
import { todayISO } from '../utils/date';
import athkarContent from '../constants/athkarContent';
import ATHKAR_META from '../constants/athkarMeta';
import useDoneAnim from '../hooks/useDoneAnim';

export default function AthkarCounterScreen({ route }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { category } = route.params;
  const meta = ATHKAR_META[category];
  const definition = athkarContent[category];
  const date = todayISO();

  const [counts, setCounts] = useState(() => definition.items.map(() => 0));
  const [syncedIndices, setSyncedIndices] = useState(new Set());

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/athkar/${date}`);
        const progress = res.categories?.[category];
        if (progress?.completedItems?.length) {
          setCounts(definition.items.map((item, idx) => (progress.completedItems.includes(idx) ? item.repeat : 0)));
          setSyncedIndices(new Set(progress.completedItems));
        }
      } catch (err) {
        // no network — counter still works locally for this session
      }
    })();
  }, [category, date, definition.items]);

  const completedCount = counts.filter((c, i) => c >= definition.items[i].repeat).length;
  const progressPercent = Math.round((completedCount / definition.items.length) * 100);

  const onTapItem = useCallback(
    async (index) => {
      const target = definition.items[index].repeat;
      const nextValue = counts[index] >= target ? 0 : counts[index] + 1;
      const wasComplete = counts[index] >= target;
      const isNowComplete = nextValue >= target;

      setCounts((prev) => prev.map((c, i) => (i === index ? nextValue : c)));

      try {
        if (Haptics?.selectionAsync) Haptics.selectionAsync();
      } catch (err) {
        // haptics unavailable on this platform — ignore
      }

      if (wasComplete !== isNowComplete) {
        try {
          await api.patch(`/athkar/${date}/${category}`, { itemIndex: index });
        } catch (err) {
          // will resync next time the screen loads with network back
        }
      }
    },
    [counts, definition.items, date, category]
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: `${meta.color}22` }]}>
          <Ionicons name={meta.icon} size={26} color={meta.color} />
        </View>
        <AppText weight="bold" size={20} style={{ marginTop: spacing.sm }}>
          {meta.title}
        </AppText>
        <AppText size={13} color={colors.inkSoft} style={{ marginTop: 2 }}>
          {completedCount} من {definition.items.length} أذكار — {progressPercent}%
        </AppText>
      </View>

      {definition.items.map((item, index) => {
        const count = counts[index];
        const done = count >= item.repeat;
        return (
          <AthkarItem key={index} item={item} count={count} done={done} onPress={() => onTapItem(index)} />
        );
      })}
    </Screen>
  );
}

// One dhikr card — its own component so the badge's color-fade animation
// can use a hook per item without breaking the rules of hooks inside the
// .map() above.
function AthkarItem({ item, count, done, onPress }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const doneAnim = useDoneAnim(done);
  const badgeBg = doneAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.amberSoft, colors.sage] });

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <Card style={[styles.itemCard, done && styles.itemCardDone]}>
        {item.label ? (
          <AppText size={11.5} weight="bold" color={colors.amberDeep} style={styles.itemLabel}>
            {item.label}
          </AppText>
        ) : null}
        <AppText size={16} weight="semibold" style={styles.itemText}>
          {item.text}
        </AppText>
        {item.source ? (
          <AppText size={11.5} color={colors.inkSoft} style={styles.itemSource}>
            {item.source}
          </AppText>
        ) : null}
        <View style={styles.itemFooter}>
          <Animated.View style={[styles.counterBadge, { backgroundColor: badgeBg }]}>
            {done ? (
              <PopIcon name="checkmark" size={16} color={colors.white} />
            ) : (
              <AppText weight="bold" size={14} color={colors.ink}>
                {count}/{item.repeat}
              </AppText>
            )}
          </Animated.View>
          <AppText size={11.5} color={colors.inkSoft}>
            اضغط للعد
          </AppText>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    header: { alignItems: 'center', marginBottom: spacing.lg },
    headerIcon: { width: 56, height: 56, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
    itemCard: { marginBottom: spacing.md },
    itemCardDone: { borderColor: colors.sage, backgroundColor: colors.sageSoft },
    itemLabel: { marginBottom: 4 },
    itemText: { lineHeight: 26 },
    itemSource: { marginTop: spacing.sm, lineHeight: 17 },
    itemFooter: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.md,
    },
    counterBadge: {
      minWidth: 44,
      height: 32,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.amberSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
