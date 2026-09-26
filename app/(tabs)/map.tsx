import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EntryCard } from '@/components/EntryCard';
import { boundsOf, clusterEntries, type Cluster } from '@/components/MapCluster';
import { EmptyState, Glass, IconButton, useTabBarInset } from '@/components/ui';
import { useJournal } from '@/store/journal';
import { colors, mapDarkStyle, radius, shadow, spacing, type } from '@/theme';

/**
 * Where the journal happened. Each pin carries the number of entries at that
 * place; tapping one opens the list of those entries with their dates.
 */
export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarInset = useTabBarInset();
  const entries = useJournal((s) => s.entries);
  const mapRef = useRef<MapView>(null);

  const located = useMemo(() => entries.filter((e) => e.location), [entries]);
  const initialRegion = useMemo(() => boundsOf(located), [located]);

  const [region, setRegion] = useState<Region>(initialRegion as Region);
  const [selected, setSelected] = useState<Cluster | null>(null);
  const sortOrder = useJournal((s) => s.settings.sortOrder);

  // Same order as the Denník tab, so a place reads like a slice of the journal.
  const selectedEntries = useMemo(() => {
    if (!selected) return [];
    return [...selected.entries].sort((a, b) =>
      sortOrder === 'oldest' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
    );
  }, [selected, sortOrder]);

  const clusters = useMemo(
    () => clusterEntries(located, region.latitudeDelta),
    [located, region.latitudeDelta]
  );

  // On iOS the map's own tap recognizer fires for marker taps too, right
  // after the marker's onPress — without this guard it would close the sheet
  // the marker just opened.
  const markerPressedAt = useRef(0);

  const focus = (cluster: Cluster) => {
    markerPressedAt.current = Date.now();
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
        onPress={() => {
          if (Date.now() - markerPressedAt.current > 400) setSelected(null);
        }}
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
        <Glass style={styles.stat}>
          <Ionicons name="location" size={14} color={colors.accent} />
          <Text style={styles.statText}>
            {clusters.length} miest · {located.length} zápiskov
          </Text>
        </Glass>
        <IconButton
          name="scan-outline"
          size={18}
          onPress={() => mapRef.current?.animateToRegion(initialRegion as Region, 400)}
          accessibilityLabel="Zobraziť všetko"
        />
      </View>

      {selected ? (
        <Glass
          style={[
            styles.sheet,
            // A list only scrolls inside a fixed height; with maxHeight alone it
            // grows to its full content and the rest is just clipped. A few
            // entries keep the sheet hugging its content instead.
            selectedEntries.length > 3 && styles.sheetTall,
            { bottom: tabBarInset + spacing.sm },
          ]}
        >
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
            data={selectedEntries}
            keyExtractor={(entry) => entry.id}
            // flex: 1 only under the fixed height — in a content-sized sheet
            // it would collapse the list to nothing.
            style={selectedEntries.length > 3 ? styles.sheetList : undefined}
            contentContainerStyle={{ paddingHorizontal: spacing.sm }}
            renderItem={({ item }) => (
              <View style={styles.cardWrap}>
                <EntryCard
                  entry={item}
                  onPress={() => router.push({ pathname: '/entry/[id]', params: { id: item.id } })}
                />
              </View>
            )}
          />
        </Glass>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center' },

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
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    height: 38,
  },
  statText: { ...type.caption, color: colors.text },

  sheet: {
    // Floats as a glass card above the tab bar; `bottom` is set inline.
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    maxHeight: '62%',
    borderRadius: radius.xl + 6,
    paddingBottom: spacing.sm,
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

  sheetTall: { height: '62%' },
  sheetList: { flex: 1 },
  cardWrap: { paddingBottom: spacing.sm },
});
