import { Image } from 'expo-image';

import { mediaSource } from '@/lib/media';
import type { Media } from '@/types';

/**
 * Small grid-sized copies of photos, kept in expo-image's disk cache.
 *
 * A gallery tile is ~130 pt wide, but the file behind it is a 12 MP original —
 * decoding that for every tile on every visit is what made the grid crawl in.
 * Media that arrived through sync was worse still: its signed URL changes on
 * every sync, so the cache (keyed by URL) missed and the full original was
 * downloaded again.
 *
 * Each photo is now decoded once, downscaled, and stored under a key derived
 * from its id, which never changes. Tiles render from that key afterwards.
 */

/** px on the longer side — 3 across on a 3× phone, with room to spare */
const THUMB_SIZE = 400;

/** decoding a full-size original is memory-heavy; a few at a time is plenty */
const CONCURRENCY = 3;

export function thumbnailKey(media: Pick<Media, 'id'>): string {
  return `lumen-thumb-${media.id}`;
}

/** Source for a tile once `ensureThumbnail` has resolved true. */
export function thumbnailSource(media: Media): { uri: string; cacheKey: string } | null {
  const original = mediaSource(media);
  return original ? { uri: original.uri, cacheKey: thumbnailKey(media) } : null;
}

const ready = new Set<string>();
const inFlight = new Map<string, Promise<boolean>>();

export function isThumbnailReady(media: Pick<Media, 'id'>): boolean {
  return ready.has(media.id);
}

/* A tiny LIFO queue: when the user flicks through years of photos, the tiles
   they stop on were requested last and should be decoded first. */
const queue: { run: () => Promise<void> }[] = [];
let running = 0;

function pump() {
  while (running < CONCURRENCY && queue.length) {
    const job = queue.pop()!;
    running++;
    void job.run().finally(() => {
      running--;
      pump();
    });
  }
}

async function generate(media: Media): Promise<boolean> {
  const key = thumbnailKey(media);
  if (await Image.getCachePathAsync(key)) return true;

  const original = mediaSource(media);
  if (!original) return false;

  const image = await Image.loadAsync(original, { maxWidth: THUMB_SIZE, maxHeight: THUMB_SIZE });
  await Image.writeToCacheAsync(image, key);
  return true;
}

/**
 * Makes sure a thumbnail exists. Resolves false when it cannot be made (a
 * video, no source yet, an unreadable file) — callers then fall back to the
 * original.
 */
export function ensureThumbnail(media: Media): Promise<boolean> {
  if (media.kind !== 'photo') return Promise.resolve(false);
  if (ready.has(media.id)) return Promise.resolve(true);

  const pending = inFlight.get(media.id);
  if (pending) return pending;

  const promise = new Promise<boolean>((resolve) => {
    queue.push({
      run: () =>
        generate(media)
          .catch((err) => {
            console.warn('[lumen] could not make thumbnail', media.id, err);
            return false;
          })
          .then((ok) => {
            if (ok) ready.add(media.id);
            inFlight.delete(media.id);
            resolve(ok);
          }),
    });
    pump();
  });

  inFlight.set(media.id, promise);
  return promise;
}
