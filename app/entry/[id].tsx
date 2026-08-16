import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui';
import { formatLongDate, formatTime, formatWeekday } from '@/lib/date';
import { mediaSource } from '@/lib/media';
import { formatLocation } from '@/lib/location';
import { useJournal } from '@/store/journal';
import { colors, mapDarkStyle, radius, spacing, type } from '@/theme';

/** Read view for a single entry. */
export default function EntryDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();

  const entry = useJournal((s) => s.entries.find((e) => e.id === id));
  const updateEntry = useJournal((s) => s.updateEntry);
  const deleteEntry = useJournal((s) => s.deleteEntry);

  if (!entry) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.missing}>Zápisok sa nenašiel.</Text>
      </View>
    );
  }

  const place = formatLocation(entry.location);
  const heroWidth = width - spacing.lg * 2;

  const confirmDelete = () => {
    Alert.alert('Zmazať zápisok?', 'Zmažú sa aj priradené fotky. Táto akcia sa nedá vrátiť.', [
      { text: 'Zrušiť', style: 'cancel' },
      {
        text: 'Zmazať',
        style: 'destructive',
        onPress: () => {
          deleteEntry(entry.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <IconButton name="chevron-back" onPress={() => router.back()} accessibilityLabel="Späť" />
        <View style={styles.headerActions}>
          <IconButton
            name={entry.starred ? 'star' : 'star-outline'}
            tint={entry.starred ? colors.accent : colors.text}
            onPress={() => updateEntry(entry.id, { starred: !entry.starred })}
            accessibilityLabel="Obľúbené"
          />
          <IconButton
            name="create-outline"
            onPress={() => router.push({ pathname: '/entry/edit', params: { id: entry.id } })}
            accessibilityLabel="Upraviť"
          />
          <IconButton
            name="trash-outline"
            tint={colors.danger}
            onPress={confirmDelete}
            accessibilityLabel="Zmazať"
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.date}>{formatLongDate(entry.date)}</Text>
        <View style={styles.metaLine}>
          <Text style={styles.meta}>
            {formatWeekday(entry.date)} · {formatTime(entry.date)}
          </Text>
          {entry.templateName ? (
            <View style={styles.templateChip}>
              <Text style={styles.templateChipLabel}>{entry.templateName}</Text>
            </View>
          ) : null}
        </View>

        {place ? (
          <Pressable
            onPress={() => router.push('/map')}
            style={({ pressed }) => [styles.placeRow, pressed && styles.pressed]}
          >
            <Ionicons name="location" size={14} color={colors.accent} />
            <Text style={styles.placeLabel} numberOfLines={1}>
              {place}
            </Text>
          </Pressable>
        ) : null}

        {/* Photos */}
        {entry.media.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.mediaScroll}
            contentContainerStyle={{ gap: spacing.sm }}
            snapToInterval={heroWidth + spacing.sm}
            decelerationRate="fast"
          >
            {entry.media.map((media) => (
              <Pressable
                key={media.id}
                onPress={() =>
                  router.push({
                    pathname: '/viewer',
                    params: { entryId: entry.id, mediaId: media.id, scope: 'entry' },
                  })
                }
                style={[
                  styles.hero,
                  { width: entry.media.length > 1 ? heroWidth * 0.86 : heroWidth },
                ]}
              >
                <Image
                  source={mediaSource(media)}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={160}
                  cachePolicy="memory-disk"
                />
                {media.kind === 'video' ? (
                  <View style={styles.playOverlay}>
                    <Ionicons name="play" size={22} color="#fff" />
                  </View>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {/* Body */}
        {entry.sections?.length ? (
          <View style={styles.sections}>
            {entry.sections
              .filter((section) => section.value.trim())
              .map((section) => (
                <View key={section.fieldId} style={styles.section}>
                  <Text style={styles.sectionLabel}>{section.label}</Text>
                  <Text style={styles.sectionValue}>{section.value.trim()}</Text>
                </View>
              ))}
          </View>
        ) : (
          <Text style={styles.freeText}>{entry.text || 'Prázdny zápisok'}</Text>
        )}

        {/* Mini map */}
        {entry.location ? (
          <View style={styles.mapCard}>
            <MapView
              style={styles.map}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
              customMapStyle={Platform.OS === 'android' ? mapDarkStyle : undefined}
              userInterfaceStyle="dark"
              initialRegion={{
                latitude: entry.location.latitude,
                longitude: entry.location.longitude,
                latitudeDelta: 0.008,
                longitudeDelta: 0.008,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              pointerEvents="none"
            >
              <Marker
                coordinate={{
                  latitude: entry.location.latitude,
                  longitude: entry.location.longitude,
                }}
                tracksViewChanges={false}
              >
                <View style={styles.mapPin} />
              </Marker>
            </MapView>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  missing: { ...type.body, color: colors.textMuted },
  pressed: { opacity: 0.6 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerActions: { flexDirection: 'row', gap: spacing.sm },

  date: { ...type.display, color: colors.text, marginTop: spacing.sm },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  meta: { ...type.small, color: colors.textMuted, textTransform: 'lowercase' },
  templateChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accentBorder,
  },
  templateChipLabel: { ...type.caption, color: colors.accent },

  placeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  placeLabel: { ...type.small, color: colors.textMuted, flexShrink: 1 },

  mediaScroll: { marginTop: spacing.xl, marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg },
  hero: {
    height: 260,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceRaised,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.scrim,
  },

  sections: { marginTop: spacing.xl, gap: spacing.lg },
  section: { gap: spacing.xs },
  sectionLabel: { ...type.caption, color: colors.accent, fontWeight: '600' },
  sectionValue: { ...type.body, color: colors.text, lineHeight: 24 },

  freeText: { ...type.body, color: colors.text, lineHeight: 25, marginTop: spacing.xl },

  mapCard: {
    height: 150,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: spacing.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  map: { flex: 1 },
  mapPin: {
    width: 14,
    height: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.bg,
  },
});
