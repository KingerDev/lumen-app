import { lang, uses24h } from '@/lib/i18n';
import type { ISODate } from '@/types';

const MONTHS_SK = [
  'januára', 'februára', 'marca', 'apríla', 'mája', 'júna',
  'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra',
];

const MONTHS_SK_NOM = [
  'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
  'Júl', 'August', 'September', 'Október', 'November', 'December',
];

const DAYS_SK = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'];
const DAYS_SK_SHORT = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'];

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const en = lang === 'en';

const pad = (n: number) => String(n).padStart(2, '0');

export function toDate(value: ISODate | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Local calendar day key, e.g. "2026-08-15". Used to bucket lists and the gallery. */
export function dayKey(value: ISODate | Date): string {
  const d = toDate(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "2026-08" — the gallery's month buckets. */
export function monthKey(value: ISODate | Date): string {
  const d = toDate(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** "15. augusta 2026" / "August 15, 2026" */
export function formatLongDate(value: ISODate | Date): string {
  const d = toDate(value);
  if (en) return `${MONTHS_EN[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  return `${d.getDate()}. ${MONTHS_SK[d.getMonth()]} ${d.getFullYear()}`;
}

/** "August 2026" — gallery section headers. */
export function formatMonth(value: ISODate | Date): string {
  const d = toDate(value);
  return `${(en ? MONTHS_EN : MONTHS_SK_NOM)[d.getMonth()]} ${d.getFullYear()}`;
}

/** "piatok" / "Friday" */
export function formatWeekday(value: ISODate | Date): string {
  return (en ? DAYS_EN : DAYS_SK)[toDate(value).getDay()];
}

/** "Pi" / "Fri" */
export function formatWeekdayShort(value: ISODate | Date): string {
  const day = toDate(value).getDay();
  return en ? DAYS_EN[day].slice(0, 3) : DAYS_SK_SHORT[day];
}

/** "23:12", or "11:12 PM" where the phone uses a 12-hour clock. */
export function formatTime(value: ISODate | Date): string {
  const d = toDate(value);
  if (uses24h) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const hours = d.getHours() % 12 || 12;
  return `${hours}:${pad(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

/** "15. augusta 2026 · 23:12" */
export function formatDateTime(value: ISODate | Date): string {
  return `${formatLongDate(value)} · ${formatTime(value)}`;
}

/** "Dnes" / "Včera" / "piatok, 15. augusta" — the entry list's day headers. */
export function formatRelativeDay(value: ISODate | Date): string {
  const d = toDate(value);
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - 86_400_000));
  const key = dayKey(d);

  if (key === today) return en ? 'Today' : 'Dnes';
  if (key === yesterday) return en ? 'Yesterday' : 'Včera';

  const sameYear = d.getFullYear() === new Date().getFullYear();
  const base = en
    ? `${formatWeekday(d)}, ${MONTHS_EN[d.getMonth()]} ${d.getDate()}`
    : `${formatWeekday(d)}, ${d.getDate()}. ${MONTHS_SK[d.getMonth()]}`;
  if (en) return sameYear ? base : `${base}, ${d.getFullYear()}`;
  return sameYear ? base : `${base} ${d.getFullYear()}`;
}

/** ISO string that keeps the device's UTC offset, matching the Day One export format. */
export function toLocalISO(value: Date): ISODate {
  const offsetMin = -value.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  return (
    `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}` +
    `T${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}.000` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

export function nowISO(): ISODate {
  return toLocalISO(new Date());
}

/** Day-of-month, for the big numeral in the list's date rail. */
export function dayOfMonth(value: ISODate | Date): number {
  return toDate(value).getDate();
}

const MONTHS_SK_SHORT = [
  'jan', 'feb', 'mar', 'apr', 'máj', 'jún',
  'júl', 'aug', 'sep', 'okt', 'nov', 'dec',
];

/**
 * The compact date for a list row's left rail.
 *
 * The row has to stand on its own — the list has no day headers — so the month
 * is always shown, and the year joins it whenever the entry is not from the
 * current one. Without that, scrolling a three-year journal loses all sense of
 * where you are.
 */
export function formatRailDate(value: ISODate | Date): { day: number; month: string } {
  const d = toDate(value);
  const month = en ? MONTHS_EN[d.getMonth()].slice(0, 3) : MONTHS_SK_SHORT[d.getMonth()];
  const year = d.getFullYear();
  const currentYear = new Date().getFullYear();

  return {
    day: d.getDate(),
    month: year === currentYear ? month : `${month} ${String(year).slice(2)}`,
  };
}
