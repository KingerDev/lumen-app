import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { t } from '@/lib/i18n';
import { type StreakMoment, useCelebration } from '@/store/celebration';
import { colors, radius, shadow, spacing, type } from '@/theme';

/**
 * The popup that greets a longer streak after saving.
 *
 * Sequence: the card springs in, the flame pops with a burst of sparks, then
 * the old count rolls up and away as the new one rolls in — with a haptic on
 * the flip, since that is the actual news. It leaves on its own after a few
 * seconds, or on any tap.
 *
 * With Reduce Motion the card and number only fade in — no springs, sparks or
 * pulsing glow. With VoiceOver running the popup is announced and stays until
 * it is dismissed, since a timed view can vanish before it has been read.
 */

const VISIBLE_MS = 3400;
const EXIT_MS = 220;
const FLIP_DELAY = 520;
const SPARKS = 10;

function subtitleFor({ to, record }: StreakMoment): string {
  if (t.streak.milestones[to]) return t.streak.milestones[to];
  if (record) return t.streak.newRecord;
  return t.streak.keepGoing;
}

export function StreakCelebration() {
  const moment = useCelebration((s) => s.streak);
  const dismiss = useCelebration((s) => s.dismiss);

  // A fresh mount per moment keeps every animation starting from zero.
  if (!moment) return null;
  return <Popup key={`${moment.from}-${moment.to}`} moment={moment} onDone={dismiss} />;
}

function Popup({ moment, onDone }: { moment: StreakMoment; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reduceMotion = useReducedMotion();
  const label = t.streak.popupA11y(moment.to, subtitleFor(moment));

  const backdrop = useSharedValue(0);
  const card = useSharedValue(0);
  const flame = useSharedValue(0);
  const glow = useSharedValue(0);
  const burst = useSharedValue(0);
  const flip = useSharedValue(0);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(label);

    if (reduceMotion) {
      backdrop.value = withTiming(1, { duration: 220 });
      card.value = withTiming(1, { duration: 220 });
      flame.value = 1;
      flip.value = withDelay(FLIP_DELAY, withTiming(1, { duration: 200 }));
    } else {
      backdrop.value = withTiming(1, { duration: 220 });
      card.value = withSpring(1, { damping: 14, stiffness: 180 });
      flame.value = withDelay(
        140,
        withSequence(
          withSpring(1.28, { damping: 6, stiffness: 260 }),
          withSpring(1, { damping: 9, stiffness: 180 })
        )
      );
      burst.value = withDelay(180, withTiming(1, { duration: 760, easing: Easing.out(Easing.cubic) }));
      glow.value = withDelay(
        200,
        withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }), -1, true)
      );
      flip.value = withDelay(FLIP_DELAY, withSpring(1, { damping: 13, stiffness: 150 }));
    }

    timers.current = [
      setTimeout(() => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, FLIP_DELAY),
    ];
    let alive = true;
    void AccessibilityInfo.isScreenReaderEnabled().then((screenReader) => {
      if (alive && !screenReader) {
        timers.current.push(setTimeout(() => setLeaving(true), VISIBLE_MS));
      }
    });
    return () => {
      alive = false;
      timers.current.forEach(clearTimeout);
    };
    // Shared values are stable; this runs once per popup.
  }, []);

  useEffect(() => {
    if (!leaving) return;
    backdrop.value = withTiming(0, { duration: EXIT_MS });
    card.value = withTiming(0, { duration: EXIT_MS });
    const timer = setTimeout(onDone, EXIT_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, card.value * 1.5),
    transform: [{ scale: 0.7 + card.value * 0.3 }, { translateY: (1 - card.value) * 24 }],
  }));
  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flame.value }, { rotate: `${(1 - Math.min(flame.value, 1)) * -14}deg` }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + glow.value * 0.45,
    transform: [{ scale: 0.92 + glow.value * 0.16 }],
  }));
  const oldNumberStyle = useAnimatedStyle(() => ({
    opacity: 1 - flip.value,
    transform: [{ translateY: -flip.value * 34 }],
  }));
  const newNumberStyle = useAnimatedStyle(() => ({
    opacity: flip.value,
    transform: [{ translateY: (1 - flip.value) * 34 }, { scale: 0.85 + flip.value * 0.15 }],
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
      <Pressable
        style={styles.center}
        onPress={() => setLeaving(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={t.common.close}
      >
        <Animated.View style={[styles.card, cardStyle]}>
          <View style={styles.flameWrap}>
            {reduceMotion ? null : (
              <>
                <Animated.View style={[styles.glow, glowStyle]} />
                {Array.from({ length: SPARKS }, (_, i) => (
                  <Spark key={i} index={i} progress={burst} />
                ))}
              </>
            )}
            <Animated.View style={flameStyle}>
              <Ionicons name="flame" size={64} color={colors.accent} />
            </Animated.View>
          </View>

          <View style={styles.counter}>
            {moment.from > 0 ? (
              <Animated.Text style={[styles.number, styles.numberLayer, oldNumberStyle]}>
                {moment.from}
              </Animated.Text>
            ) : null}
            <Animated.Text style={[styles.number, newNumberStyle]}>{moment.to}</Animated.Text>
          </View>

          <Text style={styles.title}>{t.streak.inARow(moment.to)}</Text>
          <Text style={styles.subtitle}>{subtitleFor(moment)}</Text>

          {moment.record ? (
            <View style={styles.recordChip}>
              <Ionicons name="trophy" size={12} color={colors.accent} />
              <Text style={styles.recordLabel}>{t.streak.record}</Text>
            </View>
          ) : null}
        </Animated.View>
      </Pressable>
    </View>
  );
}

/** One ember flying out of the flame, evenly spread around a circle. */
function Spark({ index, progress }: { index: number; progress: SharedValue<number> }) {
  const angle = (index / SPARKS) * Math.PI * 2 + (index % 2 ? 0.18 : 0);
  const distance = index % 2 ? 58 : 72;
  const size = index % 3 === 0 ? 7 : 5;

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p === 0 ? 0 : 1 - p,
      transform: [
        { translateX: Math.cos(angle) * distance * p },
        { translateY: Math.sin(angle) * distance * p },
        { scale: 1 - p * 0.5 },
      ],
    };
  });

  return (
    <Animated.View
      style={[styles.spark, { width: size, height: size, borderRadius: size / 2 }, style]}
    />
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.scrim },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },

  card: {
    width: 260,
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accentBorder,
    ...shadow.float,
  },

  flameWrap: { width: 120, height: 110, alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.accentSoft,
  },
  spark: { position: 'absolute', backgroundColor: colors.accent },

  counter: { height: 64, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  number: {
    fontSize: 54,
    lineHeight: 64,
    fontWeight: '800',
    letterSpacing: -1.5,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  numberLayer: { position: 'absolute' },

  title: { ...type.section, color: colors.text, marginTop: 2 },
  subtitle: { ...type.small, color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },

  recordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  recordLabel: { ...type.caption, color: colors.accent, fontWeight: '700' },
});
