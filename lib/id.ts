import * as Crypto from 'expo-crypto';

/** Collision-safe id for entries, media and templates. */
export function uid(): string {
  return Crypto.randomUUID();
}

/** Unicode combining marks — stripped so "Čo som jedol" slugs cleanly. */
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

/** Short, human-scannable id for template fields. */
export function slugId(label: string): string {
  const base = label
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
  return `${base || 'field'}-${Math.random().toString(36).slice(2, 7)}`;
}
