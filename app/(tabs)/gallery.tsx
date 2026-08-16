import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui';
import { dayKey, formatLongDate, formatMonth, formatWeekday, monthKey } from '@/lib/date';
import { mediaSource } from '@/lib/media';
import { useJournal } from '@/store/journal';
import { colors, radius, spacing, type } from '@/theme';
import type { Entry, Media } from '@/types';

/**
 * Photo grid grouped by date, the way the phone's own gallery groups it.
 * Two densities: "Dni" (3 across, one section per day) and "Mesiace" (5 across,
 * one section per month) for scanning years quickly.
 */

type Grouping = 'day' | 'month';

interface Shot {
  media: Media;
  entryId: string;
  date: string;
}

type Row =
  | { kind: 'header'; key: string; title: string; subtitle: string; count: number }
  | { kind: 'grid'; key: string; shots: Shot[] };

export default function GalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const entries = useJournal((s) => s.entries);
  // Months by default: the journal averages about one photo per day, so day
  // sections alone would leave most rows two thirds empty.
  const [grouping, setGrouping] = useState<Grouping>('month');

  const columns = grouping === 'day' ? 3 : 4;
  const gutter = 3;
  const tile = (width - spacing.lg * 2 - gutter * (columns - 1)) / columns;

  const shots = useMemo<Shot[]>(
    () =>
      entries.flatMap((entry: Entry) =>
        entry.media.map((media) => ({ media, entryId: entry.id, date: entry.date }))
      ),
    [entries]
  );

  const rows = useMemo<Row[]>(() => {
    const buckets = new Map<string, Shot[]>();
    shots.forEach((shot) => {
      const key = grouping === 'day' ? dayKey(shot.date) : monthKey(shot.date);
      const bucket = buckets.get(key);
      if (bucket) bucket.push(shot);
      else buckets.set(key, [shot]);
    });

    const out: Row[] = [];
    [...buckets.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .forEach(([key, bucketShots]) => {
        const first = bucketShots[0].date;
        out.push({
          kind: 'header',
          key: `h-${key}`,
          title: grouping === 'day' ? formatLongDate(first) : formatMonth(first),
          subtitle: grouping === 'day' ? formatWeekday(first) : '',
          count: bucketShots.length,
        });
        for (let i = 0; i < bucketShots.length; i += columns) {
          out.push({
            kind: 'grid',
            key: `g-${key}-${i}`,
            shots: bucketShots.slice(i, i + columns),
          });
        }
      });
    return out;
  }, [columns, grouping, shots]);

  const openViewer = (shot: Shot) => {
    router.push({
      pathname: '/viewer',
      params: { mediaId: shot.media.id, entryId: shot.entryId },
    });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Galéria</Text>
          <Text style={styles.subtitle}>{shots.length} fotiek a videí</Text>
        </View>

        <View style={styles.segmented}>
          {(['day', 'month'] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => setGrouping(option)}
              style={[styles.segment, grouping === option && styles.segmentActive]}
            >
              <Text
                style={[styles.segmentLabel, grouping === option && styles.segmentLabelActive]}
              >
                {option === 'day' ? 'Dni' : 'Mesiace'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlashList
        data={rows}
        keyExtractor={(row) => row.key}
        contentContainerStyle={{ paddingBottom: 110, paddingHorizontal: spacing.lg }}
        renderItem={({ item }) =>
          item.kind === 'header' ? (
            <View style={[styles.sectionHeader, grouping === 'month' && styles.sectionHeaderMonth]}>
              <Text
                style={[styles.sectionTitle, grouping === 'month' && styles.sectionTitleMonth]}
                numberOfLines={1}
              >
                {item.title}
                {item.subtitle ? <Text style={styles.sectionSubtitle}>{`  ${item.subtitle}`}</Text> : null}
              </Text>
              <Text style={styles.sectionCount}>{item.count}</Text>
            </View>
          ) : (
            <View style={[styles.grid, { gap: gutter }]}>
              {item.shots.map((shot) => (
                <Tile
                  key={shot.media.id}
                  shot={shot}
                  size={tile}
                  showDate={grouping === 'month'}
                  onPress={() => openViewer(shot)}
                />
              ))}
            </View>
          )
        }
        ListEmptyComponent={
          <EmptyState
            icon="images-outline"
            title="Žiadne fotky"
            message="Keď k zápisku priradíš fotku, objaví sa tu — zoradená podľa dňa, presne ako v galérii telefónu."
          />
        }
      />
    </View>
  );
}

function Tile({
  shot,
  size,
  showDate,
  onPress,
}: {
  shot: Shot;
  size: number;
  showDate: boolean;
  onPress: () => void;
}) {
  const day = new Date(shot.date).getDate();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ width: size, height: size }, styles.tile, pressed && styles.tilePressed]}
      accessibilityRole="imagebutton"
      accessibilityLabel={`Fotka z ${formatLongDate(shot.date)}`}
    >
      <Image
        source={mediaSource(shot.media)}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={120}
        cachePolicy="memory-disk"
        recyclingKey={shot.media.id}
      />
      {showDate ? (
        <View style={styles.dayBadge}>
          <Text style={styles.dayBadgeText}>{day}</Text>
        </View>
      ) : null}
      {shot.media.kind === 'video' ? (
        <View style={styles.videoBadge}>
          <Ionicons name="play" size={10} color="#fff" />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: { ...type.display, color: colors.text },
  subtitle: { ...type.caption, color: colors.textFaint, marginTop: 2 },

  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.pill,
    padding: 3,
  },
  segment: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  segmentActive: { backgroundColor: colors.accent },
  segmentLabel: { ...type.caption, color: colors.textMuted },
  segmentLabelActive: { color: colors.accentText, fontWeight: '700' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  // Months carry more photos each, so their headers earn a bit more air.
  sectionHeaderMonth: { paddingTop: spacing.xxl },
  sectionTitle: { ...type.small, fontWeight: '600', color: colors.text, flexShrink: 1 },
  sectionTitleMonth: { ...type.section },
  sectionSubtitle: { ...type.caption, color: colors.textFaint },
  sectionCount: { ...type.caption, color: colors.textFaint },

  grid: { flexDirection: 'row', marginBottom: 3 },
  tile: { borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.surfaceRaised },
  tilePressed: { opacity: 0.7 },

  dayBadge: {
    position: 'absolute',
    left: 3,
    bottom: 3,
    minWidth: 17,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.scrimStrong,
    alignItems: 'center',
  },
  dayBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  videoBadge: {
    position: 'absolute',
    right: 3,
    top: 3,
    width: 17,
    height: 17,
    borderRadius: radius.pill,
    backgroundColor: colors.scrimStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
