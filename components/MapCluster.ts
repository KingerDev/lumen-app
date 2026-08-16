import type { Entry } from '@/types';

/**
 * Grid clustering.
 *
 * Pins are snapped to a lat/lng grid whose cell size follows the visible span,
 * so a country-level view collapses a whole city into one pin and a street-level
 * view pulls the same entries apart again. Cheap enough to run on every region
 * change without a clustering library.
 */

export interface Cluster {
  id: string;
  latitude: number;
  longitude: number;
  entries: Entry[];
  /** distinct calendar days represented in this cluster */
  dayCount: number;
  /** best label for the place, taken from the most specific entry */
  label: string;
}

/** ~12 cells across the visible span, clamped so pins never merge into mush. */
function cellSize(span: number): number {
  return Math.max(span / 12, 0.0002);
}

export function clusterEntries(entries: Entry[], latitudeDelta: number): Cluster[] {
  const size = cellSize(latitudeDelta);
  const cells = new Map<string, Entry[]>();

  entries.forEach((entry) => {
    if (!entry.location) return;
    const { latitude, longitude } = entry.location;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    const key = `${Math.round(latitude / size)}:${Math.round(longitude / size)}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(entry);
    else cells.set(key, [entry]);
  });

  return [...cells.entries()].map(([id, bucket]) => {
    const latitude = bucket.reduce((sum, e) => sum + e.location!.latitude, 0) / bucket.length;
    const longitude = bucket.reduce((sum, e) => sum + e.location!.longitude, 0) / bucket.length;

    const days = new Set(bucket.map((e) => e.date.slice(0, 10)));
    const named = bucket.find((e) => e.location?.localityName) ?? bucket[0];
    const label =
      named.location?.localityName ??
      named.location?.placeName ??
      `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;

    return { id, latitude, longitude, entries: bucket, dayCount: days.size, label };
  });
}

/** Region that fits every located entry, with a little breathing room. */
export function boundsOf(entries: Entry[]) {
  const points = entries
    .map((e) => e.location)
    .filter((l): l is NonNullable<typeof l> => Boolean(l));

  if (!points.length) {
    // Slovakia, so the map is never a blank ocean on first run.
    return { latitude: 48.7, longitude: 19.5, latitudeDelta: 3.2, longitudeDelta: 3.2 };
  }

  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.4, 0.02),
    longitudeDelta: Math.max((maxLng - minLng) * 1.4, 0.02),
  };
}
