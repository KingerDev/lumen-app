import { Directory, File, Paths, UploadType } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

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

/** Opens the system picker. Returns [] when the user cancels or denies access. */
export async function pickMedia(limit = 10): Promise<Media[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return [];

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    quality: 0.9,
    exif: false,
  });
  if (result.canceled) return [];

  return Promise.all(result.assets.map(persistAsset));
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
 * next sync refreshes it. Returns null when neither is available yet.
 */
export function mediaSource(media: Media): { uri: string } | null {
  if (media.uri) return { uri: media.uri };
  if (media.remoteUrl) return { uri: media.remoteUrl };
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
