import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { plural } from '@/lib/plural';
import { colors, radius, spacing, type } from '@/theme';

/**
 * The "days in a row" chip in the journal header.
 *
 * Renders nothing at zero. A broken or not-yet-started streak is not news the
 * header has to carry, and a "0 dní" chip only nags.
 *
 * A live streak that today has not fed yet shows muted with a hollow flame —
 * visible enough to notice on the way to the FAB, quiet enough that the journal
 * does not turn into a game with a losing condition.
 */
export function StreakBadge({ days, writtenToday }: { days: number; writtenToday: boolean }) {
  if (days <= 0) return null;

  const tint = writtenToday ? colors.accent : colors.textMuted;
  const unit = plural(days, 'deň', 'dni', 'dní');

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={
        writtenToday
          ? `Séria ${days} ${unit} v rade`
          : `Séria ${days} ${unit} v rade, dnes si ešte nepísal`
      }
      style={[styles.badge, writtenToday ? styles.live : styles.idle]}
    >
      <Ionicons name={writtenToday ? 'flame' : 'flame-outline'} size={14} color={tint} />
      <Text style={[styles.label, { color: tint }]}>
        {days} {unit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 30,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  live: { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder },
  idle: { backgroundColor: colors.surface, borderColor: colors.border },
  label: { ...type.caption },
});
