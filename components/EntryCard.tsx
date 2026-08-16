import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatRailDate, formatTime, formatWeekdayShort } from '@/lib/date';
import { mediaSource } from '@/lib/media';
import { formatLocation } from '@/lib/location';
import { previewText, previewTitle } from '@/lib/templates';
import { colors, radius, spacing, type } from '@/theme';
import type { Entry } from '@/types';

/**
 * One row in the journal list: date rail on the left, text preview in the
 * middle, the entry's first photo on the right.
 */
function EntryCardBase({ entry, onPress }: { entry: Entry; onPress: () => void }) {
  const title = previewTitle(entry.templateName, entry.text, entry.sections);
  const preview = previewText(entry.text, entry.sections);
  const place = formatLocation(entry.location);
  const cover = entry.media.find((m) => m.kind === 'photo') ?? entry.media[0];
  const extra = entry.media.length - (cover ? 1 : 0);
  const rail = formatRailDate(entry.date);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Zápisok ${title ?? preview.slice(0, 40)}`}
    >
      <View style={styles.rail}>
        <Text style={styles.day}>{rail.day}</Text>
        <Text style={styles.month}>{rail.month}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.headline}>
          {title ? (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          <Text style={styles.time}>
            {formatWeekdayShort(entry.date)} · {formatTime(entry.date)}
          </Text>
        </View>

        <Text style={styles.preview} numberOfLines={title ? 2 : 3}>
          {preview || 'Prázdny zápisok'}
        </Text>

        <View style={styles.meta}>
          {place ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={12} color={colors.textFaint} />
              <Text style={styles.metaText} numberOfLines={1}>
                {place}
              </Text>
            </View>
          ) : null}
          {entry.starred ? <Ionicons name="star" size={12} color={colors.accent} /> : null}
        </View>
      </View>

      {cover ? (
        <View style={styles.thumbWrap}>
          <Image
            source={mediaSource(cover)}
            style={styles.thumb}
            contentFit="cover"
            transition={140}
            cachePolicy="memory-disk"
          />
          {cover.kind === 'video' ? (
            <View style={styles.playBadge}>
              <Ionicons name="play" size={11} color="#fff" />
            </View>
          ) : null}
          {extra > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>+{extra}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export const EntryCard = memo(EntryCardBase);

const THUMB = 76;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.surfacePressed },

  // Centred against the card, not pinned to the top — the rail reads as the
  // row's anchor rather than a floating label.
  rail: { width: 42, alignItems: 'center', alignSelf: 'center' },
  day: { fontSize: 24, fontWeight: '700', color: colors.text, letterSpacing: -0.6 },
  month: { ...type.caption, color: colors.textFaint, marginTop: -1 },

  body: { flex: 1, gap: 3 },
  headline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...type.bodyStrong, color: colors.accent, flexShrink: 1 },
  time: { ...type.caption, color: colors.textFaint, marginLeft: 'auto' },
  preview: { ...type.small, color: colors.textMuted, lineHeight: 19 },

  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 },
  metaText: { ...type.caption, color: colors.textFaint, flexShrink: 1 },

  thumbWrap: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceRaised,
  },
  thumb: { width: '100%', height: '100%' },
  playBadge: {
    position: 'absolute',
    left: spacing.xs,
    bottom: spacing.xs,
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.scrimStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    position: 'absolute',
    right: spacing.xs,
    bottom: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.scrimStrong,
  },
  countText: { ...type.caption, color: '#fff', fontSize: 11 },
});
