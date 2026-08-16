import { File } from 'expo-file-system';

import { ApiError, request, uploadToSignedUrl } from '@/lib/api';
import { nowISO } from '@/lib/date';
import { repo } from '@/lib/storage';
import type { Entry, Media, Template } from '@/types';

/**
 * Local-first synchronisation.
 *
 * The app never waits on the network: writes land in AsyncStorage immediately
 * and are marked `dirty`. Sync then does three things in a fixed order —
 *
 *   1. push local changes   (entries must exist server-side before their media)
 *   2. upload pending media (presign → PUT to R2 → confirm)
 *   3. pull remote changes  (brings back the merged truth, including deletions)
 *
 * Conflicts resolve last-write-wins on `updatedAt`, matching the server.
 */

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
};

export interface SyncResult {
  pushed: number;
  pulled: number;
  uploaded: number;
  failed: number;
}

/* ------------------------------------------------------------------ wire ---- */

/** Local entry → the shape POST /api/sync expects. */
function toWireEntry(entry: Entry): Record<string, unknown> {
  if (entry.deletedAt) {
    // A tombstone carries no content — sending the body of a deleted entry
    // would just be noise the server throws away.
    return { id: entry.id, updatedAt: entry.updatedAt, deletedAt: entry.deletedAt };
  }

  return {
    id: entry.id,
    updatedAt: entry.updatedAt,
    date: entry.date,
    text: entry.text,
    templateId: entry.templateId ?? null,
    templateName: entry.templateName ?? null,
    sections: entry.sections ?? null,
    location: entry.location
      ? {
          latitude: entry.location.latitude,
          longitude: entry.location.longitude,
          placeName: entry.location.placeName ?? null,
          localityName: entry.location.localityName ?? null,
          administrativeArea: entry.location.administrativeArea ?? null,
          country: entry.location.country ?? null,
          altitude: entry.location.altitude ?? null,
          auto: entry.location.auto ?? true,
        }
      : null,
    weather: entry.weather ?? null,
    tags: entry.tags ?? [],
    starred: entry.starred,
    meta: entry.meta ?? null,
  };
}

function toWireTemplate(template: Template): Record<string, unknown> {
  if (template.deletedAt) {
    return { id: template.id, updatedAt: template.updatedAt, deletedAt: template.deletedAt };
  }

  return {
    id: template.id,
    updatedAt: template.updatedAt,
    name: template.name,
    description: template.description ?? null,
    icon: template.icon,
    fields: template.fields,
    builtIn: template.builtIn ?? false,
  };
}

/**
 * Server entry → local entry.
 *
 * `existing` matters: the server does not know about this device's local file
 * paths, so already-downloaded media must keep its `uri` rather than be
 * replaced by a signed URL that will expire.
 */
function fromWireEntry(payload: any, existing?: Entry): Entry {
  const localMedia = new Map((existing?.media ?? []).map((m) => [m.id, m]));

  const media: Media[] = (payload.media ?? [])
    .filter((m: any) => !m.deletedAt)
    .map((m: any): Media => {
      const local = localMedia.get(m.id);

      return {
        id: m.id,
        kind: m.kind,
        // Keep the on-device file when we have one; otherwise the UI falls back
        // to the signed URL and expo-image caches it.
        uri: local?.uri ?? '',
        remoteKey: m.remoteKey ?? null,
        remoteUrl: m.url ?? null,
        width: m.width ?? undefined,
        height: m.height ?? undefined,
        date: m.date ?? undefined,
        md5: m.md5 ?? undefined,
        mime: m.mime ?? undefined,
        sizeBytes: m.sizeBytes ?? undefined,
      };
    });

  return {
    id: payload.id,
    date: payload.date,
    text: payload.text ?? '',
    templateId: payload.templateId ?? undefined,
    templateName: payload.templateName ?? undefined,
    sections: payload.sections ?? undefined,
    media,
    location: payload.location
      ? {
          latitude: Number(payload.location.latitude),
          longitude: Number(payload.location.longitude),
          placeName: payload.location.placeName ?? undefined,
          localityName: payload.location.localityName ?? undefined,
          administrativeArea: payload.location.administrativeArea ?? undefined,
          country: payload.location.country ?? undefined,
          altitude: payload.location.altitude ?? undefined,
          auto: payload.location.auto ?? true,
        }
      : undefined,
    weather: payload.weather ?? undefined,
    tags: payload.tags ?? [],
    starred: Boolean(payload.starred),
    createdAt: payload.createdAt ?? payload.date,
    updatedAt: payload.updatedAt,
    deletedAt: payload.deletedAt ?? null,
    dirty: false,
    meta: payload.meta ?? undefined,
  };
}

function fromWireTemplate(payload: any): Template {
  return {
    id: payload.id,
    name: payload.name,
    description: payload.description ?? undefined,
    icon: payload.icon ?? 'sunny-outline',
    fields: payload.fields ?? [],
    builtIn: payload.builtIn ?? false,
    createdAt: payload.createdAt ?? nowISO(),
    updatedAt: payload.updatedAt,
    deletedAt: payload.deletedAt ?? null,
    dirty: false,
  };
}

/* ------------------------------------------------------------------ media --- */

function mimeOf(media: Media): string {
  if (media.mime) return media.mime;
  const extension = media.uri.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXTENSION[extension] ?? (media.kind === 'video' ? 'video/mp4' : 'image/jpeg');
}

/**
 * Uploads one file and registers it against its entry.
 *
 * Returns the R2 key, or null when the local file has gone missing — that is
 * not worth failing a whole sync over, and retrying would never succeed.
 */
async function uploadMedia(entryId: string, media: Media): Promise<string | null> {
  const file = new File(media.uri);
  if (!media.uri || !file.exists) {
    console.warn('[lumen] local file missing, skipping upload', media.id);
    return null;
  }

  const mime = mimeOf(media);

  const presigned = await request<{ url: string; key: string; headers: Record<string, string> }>(
    'media/presign',
    { method: 'POST', body: { mime } }
  );

  await uploadToSignedUrl(presigned.url, media.uri, {
    ...presigned.headers,
    'Content-Type': mime,
  });

  await request('media', {
    method: 'POST',
    body: {
      id: media.id,
      entryId,
      key: presigned.key,
      kind: media.kind,
      mime,
      width: media.width ?? null,
      height: media.height ?? null,
      sizeBytes: file.size ?? null,
      date: media.date ?? null,
      md5: media.md5 ?? null,
    },
  });

  return presigned.key;
}

/* ------------------------------------------------------------------- sync --- */

export interface SyncContext {
  entries: Entry[];
  templates: Template[];
  /** applies the merged result back into the store */
  commit: (entries: Entry[], templates: Template[]) => Promise<void>;
}

export async function runSync(context: SyncContext): Promise<SyncResult> {
  const result: SyncResult = { pushed: 0, pulled: 0, uploaded: 0, failed: 0 };

  let entries = [...context.entries];
  let templates = [...context.templates];

  /* 1 — push local changes ------------------------------------------------ */

  const dirtyEntries = entries.filter((entry) => entry.dirty);
  const dirtyTemplates = templates.filter((template) => template.dirty);

  if (dirtyEntries.length || dirtyTemplates.length) {
    await request('sync', {
      method: 'POST',
      body: {
        entries: dirtyEntries.map(toWireEntry),
        templates: dirtyTemplates.map(toWireTemplate),
      },
    });

    result.pushed = dirtyEntries.length + dirtyTemplates.length;

    const pushedEntries = new Set(dirtyEntries.map((e) => e.id));
    const pushedTemplates = new Set(dirtyTemplates.map((t) => t.id));

    // Tombstones have done their job once the server knows; keeping them would
    // grow the local store forever.
    entries = entries
      .filter((entry) => !(entry.deletedAt && pushedEntries.has(entry.id)))
      .map((entry) => (pushedEntries.has(entry.id) ? { ...entry, dirty: false } : entry));

    templates = templates
      .filter((template) => !(template.deletedAt && pushedTemplates.has(template.id)))
      .map((template) =>
        pushedTemplates.has(template.id) ? { ...template, dirty: false } : template
      );
  }

  /* 2 — upload media the server has never seen ---------------------------- */

  for (const entry of entries) {
    if (entry.deletedAt) continue;

    for (const media of entry.media) {
      if (media.remoteKey) continue;

      try {
        const key = await uploadMedia(entry.id, media);
        if (key) {
          media.remoteKey = key;
          result.uploaded++;
        }
      } catch (err) {
        // One bad file must not stop the rest of the library uploading.
        console.warn('[lumen] media upload failed', media.id, err);
        result.failed++;
      }
    }
  }

  /* 3 — pull remote changes ----------------------------------------------- */

  const since = await repo.loadSyncCursor();

  const remote = await request<{
    serverTime: string;
    entries: any[];
    templates: any[];
    hasMore: boolean;
  }>('sync', { query: { since: since ?? undefined, limit: 500 } });

  const byId = new Map(entries.map((entry) => [entry.id, entry]));

  remote.entries.forEach((payload) => {
    const local = byId.get(payload.id);

    // A local edit made after the server's copy wins and will be pushed next
    // round; overwriting it here would silently discard the user's typing.
    if (local?.dirty && local.updatedAt > payload.updatedAt) return;

    if (payload.deletedAt) {
      byId.delete(payload.id);
      return;
    }

    byId.set(payload.id, fromWireEntry(payload, local));
    result.pulled++;
  });

  const templatesById = new Map(templates.map((template) => [template.id, template]));

  remote.templates.forEach((payload) => {
    const local = templatesById.get(payload.id);
    if (local?.dirty && local.updatedAt > payload.updatedAt) return;

    if (payload.deletedAt) {
      templatesById.delete(payload.id);
      return;
    }

    templatesById.set(payload.id, fromWireTemplate(payload));
    result.pulled++;
  });

  await context.commit([...byId.values()], [...templatesById.values()]);

  // Only advance the cursor once everything above succeeded — a crash mid-way
  // must re-deliver the same window rather than skip it.
  await repo.saveSyncCursor(remote.serverTime);

  return result;
}

export { ApiError };
