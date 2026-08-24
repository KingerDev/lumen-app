/**
 * Slovak noun forms: 1 / 2–4 / 5+.
 *
 *   plural(1, 'deň', 'dni', 'dní')   → 'deň'
 *   plural(3, 'deň', 'dni', 'dní')   → 'dni'
 *   plural(12, 'deň', 'dni', 'dní')  → 'dní'
 *
 * Zero takes the 5+ form, which is what Slovak does — "0 dní".
 */
export function plural(count: number, one: string, few: string, many: string): string {
  if (count === 1) return one;
  if (count >= 2 && count <= 4) return few;
  return many;
}
