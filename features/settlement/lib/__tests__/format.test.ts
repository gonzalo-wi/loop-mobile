import { differenceLabel, formatMoney, STATE_MESSAGE, statusLabel } from '../format';

describe('formatMoney', () => {
  it('formats pesos with Argentine separators', () => {
    expect(formatMoney(91500)).toBe('$ 91.500,00');
    expect(formatMoney(1234567.5)).toBe('$ 1.234.567,50');
    expect(formatMoney(0)).toBe('$ 0,00');
    expect(formatMoney(999.999)).toBe('$ 1.000,00');
  });

  it('marks negative amounts', () => {
    expect(formatMoney(-1500)).toBe('−$ 1.500,00');
  });

  it('shows a dash when there is no amount', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(Number.NaN)).toBe('—');
  });
});

describe('STATE_MESSAGE', () => {
  it('tells the driver the settlement comes after the entry control', () => {
    expect(STATE_MESSAGE.WAITING_ENTRY.hint).toBe('Vas a ver tu rendición después del control de entrada.');
  });
});

describe('labels', () => {
  it('falls back to the raw value for an unknown status or difference type', () => {
    expect(statusLabel('READY')).toBe('Listo');
    expect(statusLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW');
    expect(differenceLabel('SHORTAGE')).toBe('Faltante');
    expect(differenceLabel('OTHER')).toBe('OTHER');
  });
});
