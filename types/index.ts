/**
 * Data model for Lumen.
 *
 * Deliberately a superset of the Day One CSV export (date, text, uuid, location,
 * weather, mediaMD5s, …) so a later import maps 1:1 and loses nothing.
 * Every field the app itself doesn't surface yet is still carried in `meta`.
 */

export type ISODate = string; // e.g. "2026-08-15T23:12:00.000+02:00"

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface EntryLocation extends GeoPoint {
  /** street-level label, e.g. "Pivovarská 208/8" */
  placeName?: string;
  /** city / village */
  localityName?: string;
  /** region, e.g. "Banskobystrický kraj" */
  administrativeArea?: string;
  country?: string;
  altitude?: number;
  /** true while the coordinates came from the GPS fix and were not edited by hand */
  auto?: boolean;
}

export type MediaKind = 'photo' | 'video';

export interface Media {
  id: string;
  kind: MediaKind;
  /** local file:// uri inside the app's document dir */
  uri: string;
  width?: number;
  height?: number;
  /** capture date if the picker gave us one, otherwise the import/attach date */
  date?: ISODate;
  /** Day One md5 filename stem — the join key when importing the export */
  md5?: string;
  /** object key in R2; null until the file has been uploaded */
  remoteKey?: string | null;
  /**
   * Short-lived signed URL from the server, used when this device has no local
   * copy of the file (e.g. an entry that arrived through sync). Expires — never
   * treat it as a stable address.
   */
  remoteUrl?: string | null;
  mime?: string;
  sizeBytes?: number;
}

/** One prompt inside a template, e.g. "Kde som bol...". */
export interface TemplateField {
  id: string;
  label: string;
  /** grows to multiple lines while typing */
  multiline: boolean;
  placeholder?: string;
}

export interface Template {
  id: string;
  name: string;
  /** short line shown under the name in the picker */
  description?: string;
  /** @expo/vector-icons Ionicons name */
  icon: string;
  fields: TemplateField[];
  createdAt: ISODate;
  updatedAt: ISODate;
  /** seeded templates can be reset but not deleted */
  builtIn?: boolean;

  /** see Entry.deletedAt / Entry.dirty */
  deletedAt?: ISODate | null;
  dirty?: boolean;
}

/** A filled-in template field, stored alongside the flat text. */
export interface EntrySection {
  /** TemplateField.id, or a stable slug when the template was later edited */
  fieldId: string;
  label: string;
  value: string;
}

export interface EntryWeather {
  conditionsDescription?: string;
  temperatureCelsius?: number;
  weatherCode?: string;
  sunriseDate?: ISODate;
  sunsetDate?: ISODate;
}

export interface Entry {
  id: string;
  /** the moment the entry is *about* — editable, defaults to creation time */
  date: ISODate;
  /** flat rendered text; always kept in sync with `sections` when templated */
  text: string;
  /** present when the entry was written under a template */
  templateId?: string;
  templateName?: string;
  sections?: EntrySection[];

  media: Media[];
  location?: EntryLocation;
  weather?: EntryWeather;
  tags: string[];
  starred: boolean;

  createdAt: ISODate;
  updatedAt: ISODate;

  /**
   * Tombstone. Deleting locally only sets this — the row has to survive long
   * enough to tell the server, otherwise the entry would reappear on the next
   * pull. Cleared out once the deletion has been acknowledged.
   */
  deletedAt?: ISODate | null;

  /** Has local changes the server has not seen yet. */
  dirty?: boolean;

  /** Day One fields we keep verbatim for a lossless round-trip */
  meta?: {
    dayOneUuid?: string;
    timeZoneIdentifier?: string;
    creationDevice?: string;
    editingTime?: number;
    stepCount?: number;
    activityName?: string;
    [key: string]: unknown;
  };
}

export interface Settings {
  /** PIN lock on cold start and on return from background */
  pinEnabled: boolean;
  /** allow Face ID / fingerprint instead of typing the PIN */
  biometricsEnabled: boolean;
  /** grab a GPS fix automatically when a new entry is created */
  autoLocation: boolean;
  /** seconds in background before the lock screen comes back */
  lockAfterSeconds: number;
  /** entry list sort direction */
  sortOrder: 'newest' | 'oldest';
}

export const DEFAULT_SETTINGS: Settings = {
  pinEnabled: false,
  biometricsEnabled: false,
  autoLocation: true,
  lockAfterSeconds: 60,
  sortOrder: 'newest',
};

/** A day bucket used by the entry list and the gallery. */
export interface DaySection<T> {
  /** "2026-08-15" */
  key: string;
  title: string;
  data: T[];
}
