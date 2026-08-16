import * as Location from 'expo-location';

import type { EntryLocation } from '@/types';

/**
 * Location capture for new entries.
 *
 * Always best-effort: a denied permission or a cold GPS must never block writing
 * an entry, so every failure resolves to `null` and the editor just shows the
 * "add place" affordance instead.
 */

export async function hasLocationPermission(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === Location.PermissionStatus.GRANTED;
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === Location.PermissionStatus.GRANTED;
}

/** Reverse-geocodes a point into the street/city labels shown on entries. */
export async function describePoint(
  latitude: number,
  longitude: number
): Promise<Partial<EntryLocation>> {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (!place) return {};
    const street = [place.street, place.streetNumber].filter(Boolean).join(' ');
    return {
      placeName: place.name || street || undefined,
      localityName: place.city ?? place.subregion ?? undefined,
      administrativeArea: place.region ?? undefined,
      country: place.country ?? undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Grabs the current fix and labels it. `null` when permission is missing or the
 * device could not produce a position.
 */
export async function captureCurrentLocation(
  options: { requestIfNeeded?: boolean } = {}
): Promise<EntryLocation | null> {
  try {
    let granted = await hasLocationPermission();
    if (!granted && options.requestIfNeeded !== false) {
      granted = await requestLocationPermission();
    }
    if (!granted) return null;

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude, altitude } = position.coords;
    const described = await describePoint(latitude, longitude);

    return {
      latitude,
      longitude,
      altitude: altitude ?? undefined,
      auto: true,
      ...described,
    };
  } catch (err) {
    console.warn('[lumen] location capture failed', err);
    return null;
  }
}

/** "Pivovarská 208/8 · Banská Bystrica" — the one-line label used across the UI. */
export function formatLocation(location?: EntryLocation | null): string | null {
  if (!location) return null;
  const parts = [location.placeName, location.localityName].filter(
    (part): part is string => Boolean(part && part.trim())
  );
  const unique = parts.filter((part, index) => parts.indexOf(part) === index);
  if (unique.length) return unique.join(' · ');
  return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
}
