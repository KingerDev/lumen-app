import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { PROVIDER_DEFAULT, PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Glass, IconButton } from '@/components/ui';
import { captureCurrentLocation, describePoint } from '@/lib/location';
import { useEditor } from '@/store/editor';
import { colors, mapDarkStyle, radius, spacing, type } from '@/theme';

/**
 * Adjust the entry's place.
 *
 * The pin is fixed to the centre of the screen and the map moves under it —
 * the standard "drag the map, not the pin" pattern, which is far easier one-handed
 * than dragging a marker. The label is re-geocoded once the map settles.
 */
export default function LocationPickerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const draft = useEditor((s) => s.draft);
  const patch = useEditor((s) => s.patch);
  const mapRef = useRef<MapView>(null);

  const start: Region = {
    latitude: draft?.location?.latitude ?? 48.7359,
    longitude: draft?.location?.longitude ?? 19.1462,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const [region, setRegion] = useState<Region>(start);
  const [label, setLabel] = useState(draft?.location?.placeName ?? '');
  const [locality, setLocality] = useState(draft?.location?.localityName ?? '');
  const [resolving, setResolving] = useState(false);
  const [touched, setTouched] = useState(false);

  // Re-label whenever the map settles somewhere new, unless the user typed their own name.
  useEffect(() => {
    if (!touched) return;
    let cancelled = false;
    setResolving(true);
    describePoint(region.latitude, region.longitude)
      .then((described) => {
        if (cancelled) return;
        setLabel(described.placeName ?? '');
        setLocality(described.localityName ?? '');
      })
      .finally(() => !cancelled && setResolving(false));
    return () => {
      cancelled = true;
    };
  }, [region.latitude, region.longitude, touched]);

  const useCurrent = async () => {
    setResolving(true);
    const location = await captureCurrentLocation();
    setResolving(false);
    if (!location) return;
    setLabel(location.placeName ?? '');
    setLocality(location.localityName ?? '');
    const next = { ...region, latitude: location.latitude, longitude: location.longitude };
    setRegion(next);
    mapRef.current?.animateToRegion(next, 350);
  };

  const confirm = () => {
    patch({
      location: {
        latitude: region.latitude,
        longitude: region.longitude,
        placeName: label.trim() || undefined,
        localityName: locality.trim() || undefined,
        auto: false,
      },
    });
    router.back();
  };

  const clearLocation = () => {
    patch({ location: null });
    router.back();
  };

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        customMapStyle={Platform.OS === 'android' ? mapDarkStyle : undefined}
        userInterfaceStyle="dark"
        initialRegion={start}
        onRegionChange={() => setTouched(true)}
        onRegionChangeComplete={setRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      />

      {/* Fixed centre pin */}
      <View style={styles.pinAnchor} pointerEvents="none">
        <Ionicons name="location" size={38} color={colors.accent} />
        <View style={styles.pinShadow} />
      </View>

      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <IconButton name="close" onPress={() => router.back()} accessibilityLabel="Zavrieť" />
        <Glass style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Miesto zápisku</Text>
        </Glass>
        <IconButton
          name="navigate"
          onPress={useCurrent}
          tint={colors.accent}
          accessibilityLabel="Použiť moju polohu"
        />
      </View>

      <Glass style={[styles.sheet, { bottom: insets.bottom || spacing.sm }]}>
        <View style={styles.inputRow}>
          <Ionicons name="pricetag-outline" size={16} color={colors.textFaint} />
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="Názov miesta"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
          />
          {resolving ? <ActivityIndicator size="small" color={colors.textFaint} /> : null}
        </View>

        <View style={styles.inputRow}>
          <Ionicons name="business-outline" size={16} color={colors.textFaint} />
          <TextInput
            value={locality}
            onChangeText={setLocality}
            placeholder="Mesto / obec"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
          />
        </View>

        <Text style={styles.coords}>
          {region.latitude.toFixed(5)}, {region.longitude.toFixed(5)}
        </Text>

        <View style={styles.actions}>
          <Pressable onPress={clearLocation} style={({ pressed }) => [styles.clear, pressed && { opacity: 0.6 }]}>
            <Text style={styles.clearLabel}>Bez miesta</Text>
          </Pressable>
          <Button label="Potvrdiť" icon="checkmark" onPress={confirm} />
        </View>
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
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
  headerTitleWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  headerTitle: { ...type.bodyStrong, color: colors.text },

  pinAnchor: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    marginTop: -60,
  },
  pinShadow: {
    width: 8,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.scrim,
    marginTop: -2,
  },

  sheet: {
    // Floating glass card over the map; `bottom` is set inline.
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.xl + 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  input: { flex: 1, ...type.small, color: colors.text, paddingVertical: 0 },
  coords: { ...type.caption, color: colors.textFaint, textAlign: 'center', marginTop: 2 },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  clear: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  clearLabel: { ...type.small, color: colors.textMuted },
});
