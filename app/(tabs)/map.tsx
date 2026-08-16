import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { boundsOf, clusterEntries, type Cluster } from '@/components/MapCluster';
import { EmptyState } from '@/components/ui';
import { formatRelativeDay, formatTime } from '@/lib/date';
import { mediaSource } from '@/lib/media';
import { previewText } from '@/lib/templates';
import { useJournal } from '@/store/journal';
import { colors, mapDarkStyle, radius, shadow, spacing, type } from '@/theme';

/**
 * Where the journal happened. Each pin carries the number of entries at that
 * place; tapping one opens the list of those entries with their dates.
 */
export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const entries = useJournal((s) => s.entries);
  const mapRef = useRef<MapView>(null);

  const located = useMemo(() => entries.filter((e) => e.location), [entries]);
  const initialRegion = useMemo(() => boundsOf(located), [located]);

  const [region, setRegion] = useState<Region>(initialRegion as Region);
  const [selected, setSelected] = useState<Cluster | null>(null);

  const clusters = useMemo(
    () => clusterEntries(located, region.latitudeDelta),
    [located, region.latitudeDelta]
  );

  const focus = (cluster: Cluster) => {
    setSelected(cluster);
    mapRef.current?.animateToRegion(
      {
        latitude: cluster.latitude,
        longitude: cluster.longitude,
        latitudeDelta: Math.max(region.latitudeDelta * 0.5, 0.004),
        longitudeDelta: Math.max(region.longitudeDelta * 0.5, 0.004),
      },
      350
    );
  };

  if (!located.length) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <EmptyState
          icon="map-outline"
          title="Mapa je zatiaľ prázdna"
          message="Lumen si pri každom novom zápisku uloží miesto, kde vznikol. Akonáhle napíšeš prvý, objaví sa tu."
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        customMapStyle={Platform.OS === 'android' ? mapDarkStyle : undefined}
        userInterfaceStyle="dark"
        initialRegion={initialRegion as Region}
        onRegionChangeComplete={setRegion}
        onPress={() => setSelected(null)}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {clusters.map((cluster) => (
          <Marker
            key={cluster.id}
            coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
            onPress={() => focus(cluster)}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.pin, selected?.id === cluster.id && styles.pinActive]}>
              <Text
                style={[styles.pinCount, selected?.id === cluster.id && styles.pinCountActive]}
              >
                {cluster.entries.length}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.stat}>
          <Ionicons name="location" size={14} color={colors.accent} />
          <Text style={styles.statText}>
            {clusters.length} miest · {located.length} zápiskov
          </Text>
        </View>
        <Pressable
          onPress={() => mapRef.current?.animateToRegion(initialRegion as Region, 400)}
          style={({ pressed }) => [styles.roundButton, pressed && styles.pressed]}
          accessibilityLabel="Zobraziť všetko"
        >
          <Ionicons name="scan-outline" size={18} color={colors.text} />
        </Pressable>
      </View>

      {selected ? (
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 78 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHead}>
            <View style={styles.sheetTitleWrap}>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {selected.label}
              </Text>
              <Text style={styles.sheetSubtitle}>
                {selected.entries.length} zápiskov · {selected.dayCount} dní
              </Text>
            </View>
            <Pressable onPress={() => setSelected(null)} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <FlashList
            data={selected.entries}
            keyExtractor={(entry) => entry.id}
            contentContainerStyle={{ paddingHorizontal: spacing.lg }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push({ pathname: '/entry/[id]', params: { id: item.id } })}
                style={({ pressed }) => [styles.sheetRow, pressed && styles.pressed]}
              >
                {item.media[0] ? (
                  <Image
                    source={mediaSource(item.media[0])}
                    style={styles.sheetThumb}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={[styles.sheetThumb, styles.sheetThumbEmpty]}>
                    <Ionicons name="document-text-outline" size={16} color={colors.textFaint} />
                  </View>
                )}
                <View style={styles.sheetRowBody}>
                  <Text style={styles.sheetRowDate}>
                    {formatRelativeDay(item.date)} · {formatTime(item.date)}
                  </Text>
                  <Text style={styles.sheetRowText} numberOfLines={1}>
                    {previewText(item.text, item.sections) || 'Prázdny zápisok'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
              </Pressable>
            )}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center' },
  pressed: { opacity: 0.6 },

  pin: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  pinActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  pinCount: { ...type.caption, color: colors.accent, fontWeight: '700' },
  pinCountActive: { color: colors.accentText },

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
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    height: 38,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },
  statText: { ...type.caption, color: colors.text },
  roundButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },

  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '52%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.float,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
    marginTop: spacing.sm,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sheetTitleWrap: { flex: 1 },
  sheetTitle: { ...type.section, color: colors.text },
  sheetSubtitle: { ...type.caption, color: colors.textFaint, marginTop: 2 },

  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  sheetThumb: { width: 42, height: 42, borderRadius: radius.sm, backgroundColor: colors.surfaceRaised },
  sheetThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  sheetRowBody: { flex: 1, gap: 2 },
  sheetRowDate: { ...type.caption, color: colors.accent },
  sheetRowText: { ...type.small, color: colors.textMuted },
});
