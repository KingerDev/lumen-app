import { nowISO } from '@/lib/date';
import { slugId, uid } from '@/lib/id';
import type { EntrySection, Template, TemplateField } from '@/types';

/**
 * Template seeds.
 *
 * "Daily Self" is not invented — it is the exact prompt set from the Day One
 * export (939 entries, 929 of them under this template), so imported entries
 * line up with newly written ones field for field.
 */

function field(label: string, multiline = true, placeholder?: string): TemplateField {
  return { id: slugId(label), label, multiline, placeholder };
}

export function seedTemplates(): Template[] {
  const now = nowISO();
  const base = { createdAt: now, updatedAt: now, builtIn: true as const };

  return [
    {
      id: uid(),
      name: 'Daily Self',
      description: 'Denný prehľad dňa — miesta, ľudia, jedlo, momenty',
      icon: 'sunny-outline',
      fields: [
        field('Kde som bol...', true, 'Doma, v práci, na výlete…'),
        field('Čo som robil...'),
        field('Koho som videl...', false),
        field('Čo som dosiahol...'),
        field('Čo som jedol...', false),
        field('Príbehový moment dňa...'),
        field('Jedna vec, ktorú som sa dnes naučil...'),
        field('Čo ma dnes potešilo, alebo komu som ja dnes pomohol?'),
      ],
      ...base,
    },
    {
      id: uid(),
      name: 'Cesta',
      description: 'Pre dni mimo domova',
      icon: 'airplane-outline',
      fields: [
        field('Kam som sa dostal...', false),
        field('Čo som videl...'),
        field('Čo ma prekvapilo...'),
        field('Čo si chcem zapamätať...'),
      ],
      ...base,
    },
    {
      id: uid(),
      name: 'Vďačnosť',
      description: 'Krátky večerný zápis',
      icon: 'heart-outline',
      fields: [
        field('Za čo som dnes vďačný...'),
        field('Čo mi dnes urobilo radosť...'),
        field('Čo chcem zajtra spraviť inak...'),
      ],
      ...base,
    },
  ];
}

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
  return lines.join(' ').replace(/\s+/g, ' ');
}

/** Title line for a row: the template name, or the first line of free text. */
export function previewTitle(
  templateName: string | undefined,
  text: string,
  sections?: EntrySection[]
): string | null {
  if (templateName) return templateName;
  if (sections?.length) return null;
  const first = text.split('\n').find((l) => l.trim());
  return first && first.trim().length <= 60 ? first.trim() : null;
}
