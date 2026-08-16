import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Entry, Settings, Template } from '@/types';

/**
 * The app's only persistence boundary.
 *
 * Today it is AsyncStorage. When the R2 bucket + database + server land, only
 * this file changes: the screens and stores already talk to it through async
 * calls, so swapping the body for HTTP requests is a local edit.
 */

const KEY = {
  entries: 'lumen/entries',
  templates: 'lumen/templates',
  settings: 'lumen/settings',
  schema: 'lumen/schema-version',
  syncCursor: 'lumen/sync-cursor',
} as const;

export const SCHEMA_VERSION = 1;

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (err) {
    console.warn(`[lumen] failed to read ${key}`, err);
    return fallback;
  }
}

async function writeJSON(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const repo = {
  async loadEntries(): Promise<Entry[]> {
    return readJSON<Entry[]>(KEY.entries, []);
  },
  async saveEntries(entries: Entry[]): Promise<void> {
    await writeJSON(KEY.entries, entries);
  },

  async loadTemplates(): Promise<Template[] | null> {
    return readJSON<Template[] | null>(KEY.templates, null);
  },
  async saveTemplates(templates: Template[]): Promise<void> {
    await writeJSON(KEY.templates, templates);
  },

  async loadSettings(): Promise<Partial<Settings> | null> {
    return readJSON<Partial<Settings> | null>(KEY.settings, null);
  },
  async saveSettings(settings: Settings): Promise<void> {
    await writeJSON(KEY.settings, settings);
  },

  async markSchema(): Promise<void> {
    await writeJSON(KEY.schema, SCHEMA_VERSION);
  },

  /**
   * Server timestamp of the last successful pull. Null means "never synced",
   * which makes the next pull a full one.
   */
  async loadSyncCursor(): Promise<string | null> {
    return readJSON<string | null>(KEY.syncCursor, null);
  },
  async saveSyncCursor(serverTime: string): Promise<void> {
    await writeJSON(KEY.syncCursor, serverTime);
  },

  /** Wipes journal data. Does not touch the PIN — that lives in SecureStore. */
  async wipe(): Promise<void> {
    await AsyncStorage.multiRemove([
      KEY.entries,
      KEY.templates,
      KEY.settings,
      KEY.schema,
      KEY.syncCursor,
    ]);
  },
};
