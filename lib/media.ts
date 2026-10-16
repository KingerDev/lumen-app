import { Directory, File, Paths, UploadType } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { uid } from '@/lib/id';
import { nowISO } from '@/lib/date';
import type { Media } from '@/types';

/**
 * Media lives in the app's document directory, not in the picker's cache — the
 * cache is cleared by the OS and would leave entries pointing at dead files.
 * When the R2 bucket exists these same files become the upload source and each
 * `Media` gains a `remoteKey`.
 */

const MEDIA_DIR = 'media';

function mediaDir(): Directory {
  const dir = new Directory(Paths.document, MEDIA_DIR);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function extensionOf(uri: string, fallback: string): string {
  const match = /\.([a-zA-Z0-9]{2,5})(?:\?|$)/.exec(uri);
  return match ? match[1].toLowerCase() : fallback;
}

/** Copies a picked asset into permanent storage and returns the stored Media. */
async function persistAsset(asset: ImagePicker.ImagePickerAsset): Promise<Media> {
  const kind: Media['kind'] = asset.type === 'video' ? 'video' : 'photo';
  const ext = extensionOf(asset.uri, kind === 'video' ? 'mp4' : 'jpg');
  const id = uid();
  const dest = new File(mediaDir(), `${id}.${ext}`);

  await new File(asset.uri).copy(dest);

  return {
    id,
    kind,
    uri: dest.uri,
    width: asset.width,
    height: asset.height,
    date: nowISO(),
    remoteKey: null,
  };
}

/**
 * Opens the system picker. Returns [] when the user cancels or denies access.
 *
 * Two iOS settings here are load-bearing:
 *
 *  - `Current` representation, plus no `quality`, means the file is taken as it
 *    already is. Asking for a JPEG makes iOS transcode, and for some assets that
 *    fails outright with "Cannot load representation of type public.jpeg".
 *  - `shouldDownloadFromNetwork` fetches photos that live in iCloud and are not
 *    on the device — otherwise picking an older photo fails the same way.
 */
export async function pickMedia(limit = 10): Promise<Media[]> {
  // iOS hands the picked files over through the system picker, which needs no
  // library access — asking for it anyway would be a needless permission prompt.
  if (Platform.OS !== 'ios') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return [];
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    exif: false,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
    shouldDownloadFromNetwork: true,
  });
  if (result.canceled) return [];

  // One unreadable asset must not lose the rest of the selection.
  const settled = await Promise.allSettled(result.assets.map(persistAsset));
  const picked = settled
    .filter((entry): entry is PromiseFulfilledResult<Media> => entry.status === 'fulfilled')
    .map((entry) => entry.value);

  const failed = settled.length - picked.length;
  if (failed > 0) {
    settled.forEach((entry) => {
      if (entry.status === 'rejected') console.warn('[lumen] could not read asset', entry.reason);
    });
    throw new MediaPickError(picked, failed);
  }

  return picked;
}

/**
 * Some assets were unreadable.
 *
 * Carries the ones that did work, so the caller can attach those and still tell
 * the user what was skipped.
 */
export class MediaPickError extends Error {
  constructor(
    readonly picked: Media[],
    readonly failedCount: number
  ) {
    super(`${failedCount} media item(s) could not be read.`);
    this.name = 'MediaPickError';
  }
}

/** Shoots a photo with the camera and stores it. Returns null on cancel/deny. */
export async function capturePhoto(): Promise<Media | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchCameraAsync({ quality: 0.9, exif: false });
  if (result.canceled || !result.assets.length) return null;

  return persistAsset(result.assets[0]);
}

/** Removes the backing file. Safe to call for media that was never written. */
export function deleteMediaFile(media: Media): void {
  try {
    const file = new File(media.uri);
    if (file.exists) file.delete();
  } catch (err) {
    console.warn('[lumen] could not delete media file', media.uri, err);
  }
}

/**
 * Where to actually load a photo from.
 *
 * Media created on this device has a local file. Media that arrived through
 * sync has only a signed R2 URL, which expires — expo-image caches it, and the
 * next sync refreshes it. The cache is keyed by the media id rather than the
 * URL: a refreshed signature is still the same file, and keying by URL meant
 * downloading it all over again after every sync.
 * Returns null when neither is available yet.
 */
export function mediaSource(media: Media): { uri: string; cacheKey?: string } | null {
  if (media.uri) return { uri: media.uri };
  if (media.remoteUrl) return { uri: media.remoteUrl, cacheKey: `lumen-media-${media.id}` };
  return null;
}

/**
 * The native module needs a flat Record<string, string>.
 *
 * The signer hands back some values as arrays, and `Host` must not be sent by
 * hand at all — the network stack sets it, and a duplicate breaks the signature.
 */
function normaliseHeaders(headers: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers)
      .filter(([name]) => name.toLowerCase() !== 'host')
      .map(([name, value]) => [name, Array.isArray(value) ? value.join(', ') : String(value)])
  );
}

/**
 * PUTs a local file to a presigned R2 URL.
 *
 * Uses the native upload task rather than fetch: React Native's fetch has no
 * BodyInit that accepts a file:// path for a raw (non-multipart) body, and
 * reading a 30 MB video into JS just to send it would be wasteful even if it did.
 */
export async function uploadFileToSignedUrl(
  fileUri: string,
  url: string,
  headers: Record<string, unknown>
): Promise<void> {
  const file = new File(fileUri);

  const task = file.createUploadTask(url, {
    httpMethod: 'PUT',
    uploadType: UploadType.BINARY_CONTENT,
    headers: normaliseHeaders(headers),
  });

  const result = await task.uploadAsync();

  if (!result || result.status < 200 || result.status >= 300) {
    throw new Error(`R2 odmietlo upload (HTTP ${result?.status ?? 0}).`);
  }
}
