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
 * Two densities: "Dni" (3 across, one section per day) and "Mesiace" (4 across,
 * one section per month) for scanning years quickly.
 *
 * Every day that has a zápisok gets a place: one written without a photo shows
 * as a dark tile with a text glyph (tap opens that zápisok). Days with nothing
 * written are left out.
 */

type Grouping = 'day' | 'month';

interface Shot {
  media: Media;
  entryId: string;
  date: string;
}

/** A photo, or a stand-in for a day written without one (its newest zápisok). */
type Cell = { kind: 'shot'; shot: Shot } | { kind: 'text'; entryId: string; date: string };

type Row =
  | { kind: 'header'; key: string; title: string; subtitle: string; count: number }
  | { kind: 'grid'; key: string; cells: Cell[] };

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
    const shotsByDay = new Map<string, Shot[]>();
    shots.forEach((shot) => {
      const key = dayKey(shot.date);
      const bucket = shotsByDay.get(key);
      if (bucket) bucket.push(shot);
      else shotsByDay.set(key, [shot]);
    });
    shotsByDay.forEach((bucket) => bucket.sort((a, b) => b.date.localeCompare(a.date)));

    const newestEntryByDay = new Map<string, Entry>();
    entries.forEach((entry) => {
      const key = dayKey(entry.date);
      const current = newestEntryByDay.get(key);
      if (!current || entry.date > current.date) newestEntryByDay.set(key, entry);
    });

    // Only days that have a zápisok; newest first.
    const buckets = new Map<string, { first: string; cells: Cell[]; count: number }>();
    [...newestEntryByDay.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .forEach(([key, newest]) => {
        const bucketKey = grouping === 'day' ? key : monthKey(newest.date);
        let bucket = buckets.get(bucketKey);
        if (!bucket) {
          bucket = { first: newest.date, cells: [], count: 0 };
          buckets.set(bucketKey, bucket);
        }
        const dayShots = shotsByDay.get(key);
        if (dayShots) {
          dayShots.forEach((shot) => bucket.cells.push({ kind: 'shot', shot }));
          bucket.count += dayShots.length;
        } else {
          bucket.cells.push({ kind: 'text', entryId: newest.id, date: newest.date });
        }
      });

    const out: Row[] = [];
    buckets.forEach(({ first, cells, count }, key) => {
      out.push({
        kind: 'header',
        key: `h-${key}`,
        title: grouping === 'day' ? formatLongDate(first) : formatMonth(first),
        subtitle: grouping === 'day' ? formatWeekday(first) : '',
        count,
      });
      for (let i = 0; i < cells.length; i += columns) {
        out.push({ kind: 'grid', key: `g-${key}-${i}`, cells: cells.slice(i, i + columns) });
      }
    });
    return out;
  }, [columns, entries, grouping, shots]);

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
              {item.cells.map((cell) =>
                cell.kind === 'shot' ? (
                  <Tile
                    key={cell.shot.media.id}
                    shot={cell.shot}
                    size={tile}
                    showDate={grouping === 'month'}
                    onPress={() => openViewer(cell.shot)}
                  />
                ) : (
                  <TextTile
                    key={`t-${cell.entryId}`}
                    date={cell.date}
                    size={tile}
                    showDate={grouping === 'month'}
                    onPress={() =>
                      router.push({ pathname: '/entry/[id]', params: { id: cell.entryId } })
                    }
                  />
                )
              )}
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

/** A day written without a photo: dark tile with a text glyph, opens the zápisok. */
function TextTile({
  date,
  size,
  showDate,
  onPress,
}: {
  date: string;
  size: number;
  showDate: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { width: size, height: size },
        styles.tile,
        styles.textTile,
        pressed && styles.tilePressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Zápisok bez fotky z ${formatLongDate(date)}`}
    >
      <Ionicons
        name="document-text-outline"
        size={Math.min(22, size * 0.28)}
        color={colors.textMuted}
      />
      {showDate ? (
        <View style={styles.dayBadge}>
          <Text style={styles.dayBadgeText}>{new Date(date).getDate()}</Text>
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
  textTile: {
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
