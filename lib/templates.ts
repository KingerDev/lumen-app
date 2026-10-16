import type { EntrySection, Template } from '@/types';

/**
 * Helpers for entries written under a template.
 *
 * The templates themselves live on the server and arrive through sync — the app
 * never invents them, so a prompt set can never exist twice with two ids.
 */

/** Empty sections for a fresh entry written under `template`. */
export function sectionsFor(template: Template): EntrySection[] {
  return template.fields.map((f) => ({ fieldId: f.id, label: f.label, value: '' }));
}

/**
 * Flattens sections into the entry's `text`.
 *
 * The shape matches Day One's export exactly — template name, then alternating
 * label / value lines — so search, list previews and a future export all read
 * one consistent format.
 */
export function renderSections(templateName: string | undefined, sections: EntrySection[]): string {
  const body = sections
    .map((s) => `${s.label}\n${s.value.trim()}`)
    .join('\n')
    .trimEnd();
  return templateName ? `${templateName}\n${body}` : body;
}

/**
 * The list preview: first non-empty *answer*, skipping the template name and
 * prompt labels so a row never previews as "Daily Self / Kde som bol...".
 */
export function previewText(text: string, sections?: EntrySection[]): string {
  if (sections?.length) {
    const answered = sections.find((s) => s.value.trim());
    if (answered) return `${answered.value.trim().replace(/\s+/g, ' ')}`;
  }
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  // The first line already stands above the preview as its title.
  const body = freeTextTitle(lines) ? lines.slice(1) : lines;
  return body.join(' ').replace(/\s+/g, ' ');
}

/**
 * A short first line reads as the entry's title — but only with more text
 * under it; a one-line entry is all body, or the row would show it twice.
 */
function freeTextTitle(lines: string[]): string | null {
  return lines.length > 1 && lines[0].length <= 60 ? lines[0] : null;
}

/** Title line for a row: the template name, or the first line of free text. */
export function previewTitle(
  templateName: string | undefined,
  text: string,
  sections?: EntrySection[]
): string | null {
  if (templateName) return templateName;
  if (sections?.length) return null;
  return freeTextTitle(
    text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
  );
}
