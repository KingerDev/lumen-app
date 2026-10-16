import { create } from 'zustand';

import { nowISO } from '@/lib/date';
import { t } from '@/lib/i18n';
import { uid } from '@/lib/id';
import { deleteMediaFile } from '@/lib/media';
import { ApiError } from '@/lib/api';
import { repo } from '@/lib/storage';
import { runSync, type SyncResult } from '@/lib/sync';
import { useAuth } from '@/store/auth';
import { DEFAULT_SETTINGS, type Entry, type Media, type Settings, type Template } from '@/types';

/**
 * The journal store.
 *
 * Every mutation updates memory first and persists after, so the UI never waits
 * on storage. `repo` is the swap point for the future server.
 */

interface JournalState {
  entries: Entry[];
  templates: Template[];
  /** soft-deleted records still waiting to be pushed; never rendered */
  tombstones: { entries: Entry[]; templates: Template[] };
  settings: Settings;
  hydrated: boolean;

  /** in-flight sync, so the UI can show a spinner and callers can't overlap runs */
  syncing: boolean;
  lastSyncAt: string | null;
  syncError: string | null;

  hydrate: () => Promise<void>;
  sync: () => Promise<SyncResult | null>;

  createEntry: (draft: Partial<Entry>) => Entry;
  updateEntry: (id: string, patch: Partial<Entry>) => void;
  deleteEntry: (id: string) => void;
  getEntry: (id: string) => Entry | undefined;

  attachMedia: (entryId: string, media: Media[]) => void;
  detachMedia: (entryId: string, mediaId: string) => void;

  saveTemplate: (template: Template) => void;
  deleteTemplate: (id: string) => void;
  getTemplate: (id: string) => Template | undefined;

  updateSettings: (patch: Partial<Settings>) => void;

  /** Replaces everything — used by the future Day One import. */
  replaceAll: (entries: Entry[]) => Promise<void>;
}

/** Newest first, regardless of insertion order. */
function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Deleted records waiting to be pushed.
 *
 * Kept in their own list rather than flagged inside `entries`, so a screen
 * cannot accidentally render one. Every consumer of `entries` gets only live
 * records, with no filtering to remember.
 */
function splitTombstones<T extends { deletedAt?: string | null }>(items: T[]) {
  const live: T[] = [];
  const dead: T[] = [];
  items.forEach((item) => (item.deletedAt ? dead : live).push(item));
  return { live, dead };
}

export const useJournal = create<JournalState>((set, get) => {
  const persistEntries = (entries: Entry[]) => {
    void repo.saveEntries(entries);
  };

  return {
    entries: [],
    templates: [],
    tombstones: { entries: [], templates: [] },
    settings: DEFAULT_SETTINGS,
    hydrated: false,
    syncing: false,
    lastSyncAt: null,
    syncError: null,

    async hydrate() {
      const [entries, storedTemplates, storedSettings] = await Promise.all([
        repo.loadEntries(),
        repo.loadTemplates(),
        repo.loadSettings(),
      ]);

      // No local seeding: the server owns the templates and the first sync
      // brings them down. Seeding here would mint fresh UUIDs for prompt sets
      // the server already has, and the user would end up with each one twice.
      const allTemplates = storedTemplates ?? [];

      // Records written before sync existed have no `dirty` field at all. A
      // pull always sets it to false explicitly, so `undefined` reliably means
      // "the server has never seen this" — mark it for push rather than
      // leaving it stranded locally forever.
      const markLegacy = <T extends { dirty?: boolean }>(items: T[]): T[] =>
        items.map((item) => (item.dirty === undefined ? { ...item, dirty: true } : item));

      const splitEntries = splitTombstones(markLegacy(entries));
      const splitTemplates = splitTombstones(markLegacy(allTemplates));

      set({
        entries: sortEntries(splitEntries.live),
        templates: splitTemplates.live,
        tombstones: { entries: splitEntries.dead, templates: splitTemplates.dead },
        settings: { ...DEFAULT_SETTINGS, ...(storedSettings ?? {}) },
        hydrated: true,
      });
      void repo.markSchema();
    },

    /**
     * Pushes local changes, uploads pending media and pulls remote ones.
     *
     * Returns null when there is nothing to do — no session, or a run already
     * in flight. Never throws: sync failing is a normal offline state, not an
     * error the user has to dismiss.
     */
    async sync() {
      if (get().syncing) return null;

      const { token, invalidate } = useAuth.getState();
      if (!token) return null;

      set({ syncing: true, syncError: null });

      try {
        const { tombstones } = get();

        const result = await runSync({
          entries: [...get().entries, ...tombstones.entries],
          templates: [...get().templates, ...tombstones.templates],
          async commit(entries, templates) {
            // runSync drops tombstones it has successfully pushed, so whatever
            // still carries deletedAt has to be retried next time.
            const splitEntries = splitTombstones(entries);
            const splitTemplates = splitTombstones(templates);
            const sorted = sortEntries(splitEntries.live);

            set({
              entries: sorted,
              templates: splitTemplates.live,
              tombstones: { entries: splitEntries.dead, templates: splitTemplates.dead },
            });

            await Promise.all([
              repo.saveEntries([...sorted, ...splitEntries.dead]),
              repo.saveTemplates([...splitTemplates.live, ...splitTemplates.dead]),
            ]);
          },
        });

        set({ syncing: false, lastSyncAt: nowISO(), syncError: null });

        return result;
      } catch (err) {
        // A revoked token can only be fixed by logging in again, so drop the
        // session rather than retrying forever against a 401.
        if (err instanceof ApiError && err.isUnauthenticated) {
          await invalidate();
        }

        const message =
          err instanceof ApiError ? err.message : t.errors.syncFailed;

        console.warn('[lumen] sync failed', err);
        set({ syncing: false, syncError: message });

        return null;
      }
    },

    createEntry(draft) {
      const timestamp = nowISO();
      const entry: Entry = {
        id: uid(),
        date: draft.date ?? timestamp,
        text: draft.text ?? '',
        templateId: draft.templateId,
        templateName: draft.templateName,
        sections: draft.sections,
        media: draft.media ?? [],
        location: draft.location,
        weather: draft.weather,
        tags: draft.tags ?? [],
        starred: draft.starred ?? false,
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
        dirty: true,
        meta: draft.meta,
      };

      const entries = sortEntries([entry, ...get().entries]);
      set({ entries });
      persistEntries(entries);
      return entry;
    },

    updateEntry(id, patch) {
      const entries = sortEntries(
        get().entries.map((entry) =>
          entry.id === id ? { ...entry, ...patch, id, updatedAt: nowISO(), dirty: true } : entry
        )
      );
      set({ entries });
      persistEntries(entries);
    },

    deleteEntry(id) {
      const target = get().entries.find((entry) => entry.id === id);
      target?.media.forEach(deleteMediaFile);

      // Soft delete: the record has to survive until sync has told the server,
      // otherwise the next pull would hand the entry straight back. It moves
      // out of `entries` so nothing can render it in the meantime.
      const timestamp = nowISO();
      const entries = get().entries.filter((entry) => entry.id !== id);
      const tombstones = get().tombstones;

      const dead = target
        ? [
            ...tombstones.entries,
            { ...target, media: [], deletedAt: timestamp, updatedAt: timestamp, dirty: true },
          ]
        : tombstones.entries;

      set({ entries, tombstones: { ...tombstones, entries: dead } });
      void repo.saveEntries([...entries, ...dead]);
      void get().sync();
    },

    getEntry(id) {
      return get().entries.find((entry) => entry.id === id);
    },

    attachMedia(entryId, media) {
      if (!media.length) return;
      get().updateEntry(entryId, {
        media: [...(get().getEntry(entryId)?.media ?? []), ...media],
      });
    },

    detachMedia(entryId, mediaId) {
      const entry = get().getEntry(entryId);
      if (!entry) return;
      const removed = entry.media.find((m) => m.id === mediaId);
      if (removed) deleteMediaFile(removed);
      get().updateEntry(entryId, { media: entry.media.filter((m) => m.id !== mediaId) });
    },

    saveTemplate(template) {
      const existing = get().templates;
      const index = existing.findIndex((t) => t.id === template.id);
      const next =
        index >= 0
          ? existing.map((t) =>
              t.id === template.id ? { ...template, updatedAt: nowISO(), dirty: true } : t
            )
          : [...existing, { ...template, dirty: true }];

      set({ templates: next });
      void repo.saveTemplates(next);
    },

    deleteTemplate(id) {
      const target = get().templates.find((t) => t.id === id);
      if (!target) return;

      const timestamp = nowISO();
      const templates = get().templates.filter((t) => t.id !== id);
      const tombstones = get().tombstones;
      const dead = [
        ...tombstones.templates,
        { ...target, deletedAt: timestamp, updatedAt: timestamp, dirty: true },
      ];

      set({ templates, tombstones: { ...tombstones, templates: dead } });
      void repo.saveTemplates([...templates, ...dead]);
      void get().sync();
    },

    getTemplate(id) {
      return get().templates.find((t) => t.id === id);
    },

    updateSettings(patch) {
      const settings = { ...get().settings, ...patch };
      set({ settings });
      void repo.saveSettings(settings);
    },

    async replaceAll(entries) {
      const sorted = sortEntries(entries);
      set({ entries: sorted });
      await repo.saveEntries(sorted);
    },
  };
});
