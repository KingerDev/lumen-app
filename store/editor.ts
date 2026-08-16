import { create } from 'zustand';

import { nowISO } from '@/lib/date';
import { sectionsFor } from '@/lib/templates';
import type { Entry, EntryLocation, EntrySection, ISODate, Media, Template } from '@/types';

/**
 * The entry currently being written.
 *
 * Kept in a store rather than screen state because the editor hands off to
 * modal pickers (location, media) and must survive that navigation intact.
 */

export interface Draft {
  /** set when editing an existing entry */
  entryId?: string;
  date: ISODate;
  text: string;
  templateId?: string;
  templateName?: string;
  sections?: EntrySection[];
  media: Media[];
  location?: EntryLocation | null;
  starred: boolean;
  /** true once anything has been touched — drives the "discard?" prompt */
  dirty: boolean;
}

interface EditorState {
  draft: Draft | null;
  beginNew: (template?: Template) => void;
  beginEdit: (entry: Entry) => void;
  patch: (patch: Partial<Draft>) => void;
  setSection: (fieldId: string, value: string) => void;
  addMedia: (media: Media[]) => void;
  removeMedia: (mediaId: string) => void;
  clear: () => void;
}

export const useEditor = create<EditorState>((set, get) => ({
  draft: null,

  beginNew(template) {
    set({
      draft: {
        date: nowISO(),
        text: '',
        templateId: template?.id,
        templateName: template?.name,
        sections: template ? sectionsFor(template) : undefined,
        media: [],
        location: null,
        starred: false,
        dirty: false,
      },
    });
  },

  beginEdit(entry) {
    set({
      draft: {
        entryId: entry.id,
        date: entry.date,
        text: entry.text,
        templateId: entry.templateId,
        templateName: entry.templateName,
        sections: entry.sections ? entry.sections.map((s) => ({ ...s })) : undefined,
        media: [...entry.media],
        location: entry.location ?? null,
        starred: entry.starred,
        dirty: false,
      },
    });
  },

  patch(patch) {
    const draft = get().draft;
    if (!draft) return;
    set({ draft: { ...draft, ...patch, dirty: true } });
  },

  setSection(fieldId, value) {
    const draft = get().draft;
    if (!draft?.sections) return;
    set({
      draft: {
        ...draft,
        sections: draft.sections.map((s) => (s.fieldId === fieldId ? { ...s, value } : s)),
        dirty: true,
      },
    });
  },

  addMedia(media) {
    const draft = get().draft;
    if (!draft || !media.length) return;
    set({ draft: { ...draft, media: [...draft.media, ...media], dirty: true } });
  },

  removeMedia(mediaId) {
    const draft = get().draft;
    if (!draft) return;
    set({ draft: { ...draft, media: draft.media.filter((m) => m.id !== mediaId), dirty: true } });
  },

  clear() {
    set({ draft: null });
  },
}));
