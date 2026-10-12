const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number) => String(n).padStart(2, '0');

/** "07:05" in the device's time zone; empty when the value isn't a date. */
export function formatClockTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Backend calendar date "2026-10-01" → "01/10/2026". Split as text: parsing it
 * with Date would read it as UTC midnight and show the previous day in Argentina.
 */
export function isoDateToDisplay(date: string): string {
  const match = ISO_DATE.exec(date);
  if (!match) return date;
  const [, y, m, d] = match;
  return `${d}/${m}/${y}`;
}

/** "Mar 13/10/2026", for a date the user picked. */
export function toLongDisplayDate(date: Date): string {
  return `${WEEKDAYS[date.getDay()]} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}
