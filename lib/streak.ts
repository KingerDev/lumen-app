import { dayKey } from '@/lib/date';
import type { Entry } from '@/types';

/**
 * How consistently the journal gets written.
 *
 * A streak counts *calendar days that have at least one entry*, not entries —
 * three zápisky on one evening are still one day. The day is taken from
 * `entry.date` (the date the entry is about, which the user can edit), not from
 * `createdAt`: back-filling yesterday evening's entry this morning should mend
 * yesterday, which is exactly what the user means by "písal som každý deň".
 */

export interface Streak {
  /** consecutive days ending today, or yesterday if today is not written yet */
  current: number;
  /** the longest run the journal has ever had */
  longest: number;
  /** whether today already has an entry — the badge nudges when it does not */
  writtenToday: boolean;
  /** distinct days written, ever */
  totalDays: number;
}

const EMPTY: Streak = { current: 0, longest: 0, writtenToday: false, totalDays: 0 };

/**
 * Days since the epoch for a "YYYY-MM-DD" key.
 *
 * Deliberately routed through `Date.UTC` on the already-split parts: UTC has no
 * daylight saving, so consecutive calendar days are always exactly one apart.
 * Subtracting 86 400 000 ms from a local Date would slip by an hour twice a
 * year and silently break a streak in late October.
 */
function dayNumber(key: string): number {
  const [year, month, day] = key.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function computeStreak(
  entries: readonly Pick<Entry, 'date'>[],
  today: Date = new Date()
): Streak {
  const days = new Set<number>();
  entries.forEach((entry) => days.add(dayNumber(dayKey(entry.date))));

  if (days.size === 0) return EMPTY;

  const sorted = [...days].sort((a, b) => a - b);

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = sorted[i] - sorted[i - 1] === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  const todayNumber = dayNumber(dayKey(today));
  const writtenToday = days.has(todayNumber);

  // Yesterday still anchors a live streak. The day is not over yet, so a run
  // only breaks once a whole calendar day has passed unwritten — otherwise the
  // streak would read as lost every morning until the user typed something.
  let cursor = writtenToday ? todayNumber : todayNumber - 1;
  let current = 0;
  while (days.has(cursor)) {
    current++;
    cursor--;
  }

  return { current, longest, writtenToday, totalDays: days.size };
}
