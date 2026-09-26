import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass, IconButton } from '@/components/ui';
import { formatLongDate, formatTime, formatWeekday } from '@/lib/date';
import { mediaSource } from '@/lib/media';
import { formatLocation } from '@/lib/location';
import { useJournal } from '@/store/journal';
import { colors, radius, spacing, type } from '@/theme';
import type { Media } from '@/types';

/**
 * Full-screen media viewer.
 *
 * Every frame keeps its date on screen — the whole reason the gallery exists is
 * to browse by *when*, so the date must not disappear behind a tap-to-reveal.
 */

interface Slide {
  media: Media;
  entryId: string;
  date: string;
  place: string | null;
}

export default function ViewerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams<{ mediaId: string; entryId: string; scope?: string }>();

  const entries = useJournal((s) => s.entries);
  const listRef = useRef<FlatList<Slide>>(null);

  const slides = useMemo<Slide[]>(() => {
    const source = params.scope === 'entry' ? entries.filter((e) => e.id === params.entryId) : entries;
    return source.flatMap((entry) =>
      entry.media.map((media) => ({
        media,
        entryId: entry.id,
        date: entry.date,
        place: formatLocation(entry.location),
      }))
    );
  }, [entries, params.entryId, params.scope]);

  const startIndex = Math.max(
    slides.findIndex((slide) => slide.media.id === params.mediaId),
    0
  );
  const [index, setIndex] = useState(startIndex);
  const current = slides[index] ?? slides[startIndex];

  if (!current) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.missing}>Fotka sa nenašla.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(slide) => slide.media.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={startIndex}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(event) =>
          setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ item, index: slideIndex }) => (
          <View style={{ width, height }}>
            {item.media.kind === 'video' ? (
              <VideoSlide uri={item.media.uri} active={slideIndex === index} />
            ) : (
              <Image
                source={mediaSource(item.media)}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                transition={140}
                cachePolicy="memory-disk"
              />
            )}
          </View>
        )}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <IconButton
          name="close"
          tint="#fff"
          onPress={() => router.back()}
          accessibilityLabel="Zavrieť"
        />
        <Glass fallback={colors.scrimStrong} style={styles.counter}>
          <Text style={styles.counterText}>
            {index + 1} / {slides.length}
          </Text>
        </Glass>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Glass fallback={colors.scrimStrong} style={styles.dateCard}>
          <Text style={styles.dateText}>{formatLongDate(current.date)}</Text>
          <Text style={styles.dateMeta}>
            {formatWeekday(current.date)} · {formatTime(current.date)}
            {current.place ? ` · ${current.place}` : ''}
          </Text>
        </Glass>

        <Pressable
          onPress={() =>
            router.push({ pathname: '/entry/[id]', params: { id: current.entryId } })
          }
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Glass interactive tint={colors.accent} style={styles.openButton}>
            <Ionicons name="book-outline" size={16} color={colors.accentText} />
            <Text style={styles.openLabel}>Otvoriť zápisok</Text>
          </Glass>
        </Pressable>
      </View>
    </View>
  );
}

/** Only the visible slide gets a player, so scrolling never spins up N decoders. */
function VideoSlide({ uri, active }: { uri: string; active: boolean }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
  });

  useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);

  return (
    <VideoView style={StyleSheet.absoluteFill} player={player} contentFit="contain" nativeControls />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  missing: { ...type.body, color: colors.textMuted },
  pressed: { opacity: 0.6 },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  counter: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  counterText: { ...type.caption, color: '#fff' },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  dateCard: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 2,
  },
  dateText: { ...type.section, color: '#fff' },
  dateMeta: { ...type.caption, color: 'rgba(255,255,255,0.7)' },

  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 46,
    borderRadius: radius.pill,
  },
  openLabel: { ...type.small, fontWeight: '700', color: colors.accentText },
});
