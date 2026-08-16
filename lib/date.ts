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

/** "15. augusta 2026" */
export function formatLongDate(value: ISODate | Date): string {
  const d = toDate(value);
  return `${d.getDate()}. ${MONTHS_SK[d.getMonth()]} ${d.getFullYear()}`;
}

/** "August 2026" — gallery section headers. */
export function formatMonth(value: ISODate | Date): string {
  const d = toDate(value);
  return `${MONTHS_SK_NOM[d.getMonth()]} ${d.getFullYear()}`;
}

/** "piatok" */
export function formatWeekday(value: ISODate | Date): string {
  return DAYS_SK[toDate(value).getDay()];
}

/** "Pi" */
export function formatWeekdayShort(value: ISODate | Date): string {
  return DAYS_SK_SHORT[toDate(value).getDay()];
}

/** "23:12" */
export function formatTime(value: ISODate | Date): string {
  const d = toDate(value);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

  if (key === today) return 'Dnes';
  if (key === yesterday) return 'Včera';

  const sameYear = d.getFullYear() === new Date().getFullYear();
  const base = `${formatWeekday(d)}, ${d.getDate()}. ${MONTHS_SK[d.getMonth()]}`;
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
