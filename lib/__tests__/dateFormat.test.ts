import { formatClockTime, isoDateToDisplay, toLongDisplayDate } from '../dateFormat';

describe('formatClockTime', () => {
  it('shows the local hour and minute with two digits', () => {
    expect(formatClockTime(new Date(2026, 9, 12, 7, 5).toISOString())).toBe('07:05');
  });
  it('returns an empty string for an unparseable value instead of "NaN:NaN"', () => {
    expect(formatClockTime('nope')).toBe('');
    expect(formatClockTime('')).toBe('');
  });
});

describe('isoDateToDisplay', () => {
  it('turns a backend date into dd/mm/yyyy without going through the time zone', () => {
    expect(isoDateToDisplay('2026-10-01')).toBe('01/10/2026');
  });
  it('returns the raw value when it is not yyyy-mm-dd', () => {
    expect(isoDateToDisplay('01/10/2026')).toBe('01/10/2026');
    expect(isoDateToDisplay('2026-10-01T10:00:00Z')).toBe('2026-10-01T10:00:00Z');
  });
});

describe('toLongDisplayDate', () => {
  it('includes the weekday and the full year', () => {
    expect(toLongDisplayDate(new Date(2026, 9, 13))).toBe('Mar 13/10/2026');
  });
});
