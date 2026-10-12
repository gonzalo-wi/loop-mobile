import { toShortDisplayDate } from '../displayDate';

describe('toShortDisplayDate', () => {
  const now = new Date(2026, 9, 12); // Mon 12/10/2026

  it('shows weekday, zero-padded day and month without the current year', () => {
    expect(toShortDisplayDate(new Date(2026, 9, 12), now)).toBe('Lun 12/10');
    expect(toShortDisplayDate(new Date(2026, 0, 7), now)).toBe('Mié 07/01');
  });

  it('adds the year when it is not the current one', () => {
    expect(toShortDisplayDate(new Date(2027, 0, 2), new Date(2026, 11, 31))).toBe('Sáb 02/01/2027');
  });
});
