/** "Lun 12/10" to fit in a pill; the year is added only when it isn't the current one. */
export function toShortDisplayDate(date: Date, now: Date = new Date()): string {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear() === now.getFullYear() ? '' : `/${date.getFullYear()}`;
  return `${days[date.getDay()]} ${d}/${m}${year}`;
}
