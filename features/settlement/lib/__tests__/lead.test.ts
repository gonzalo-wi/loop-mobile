import { leadOf, officialReview } from '../lead';
import type { SettlementFigures } from '../../types';

const BASE: SettlementFigures = {
  expectedCash: 90000,
  expectedChecks: 0,
  expectedWithholdings: 0,
  expectedTotal: 90000,
  depositedCash: 0,
  confirmedChecks: 0,
  confirmedWithholdings: 0,
  totalReceived: 0,
  difference: null,
  differenceType: null,
  statusGroup: 'PENDING',
  expectedUpdatedAt: null,
  lastDepositAt: null,
  cashDifference: null,
  depositsCheckedAt: null,
  depositsLive: true,
};

describe('leadOf', () => {
  it('tells how much cash to deposit before the deposit', () => {
    expect(leadOf(BASE)).toEqual({ tone: 'blue', eyebrow: 'Tenés que depositar', title: '$ 90.000,00' });
  });

  it('says treasury has no amount yet when the expected cash is missing', () => {
    expect(leadOf({ ...BASE, expectedCash: null }).title).toBe('Tesorería todavía no tiene el monto');
  });

  it('shows what is missing after a short deposit', () => {
    expect(leadOf({ ...BASE, depositedCash: 80000, cashDifference: -10000 })).toEqual({
      tone: 'orange',
      eyebrow: 'Te faltan',
      title: '$ 10.000,00',
    });
  });

  it('shows what is left over', () => {
    expect(leadOf({ ...BASE, depositedCash: 91500, cashDifference: 1500 })).toEqual({
      tone: 'green',
      eyebrow: 'Te sobran',
      title: '$ 1.500,00',
    });
  });

  it('says the deposit was exact', () => {
    expect(leadOf({ ...BASE, depositedCash: 90000, cashDifference: 0 }).title).toBe('Justo');
  });
});

describe('officialReview', () => {
  it('is pending until treasury reviews the route', () => {
    expect(officialReview(BASE)).toBe('Pendiente de revisión de tesorería');
  });

  it('shows the official shortage or surplus with its amount', () => {
    expect(officialReview({ ...BASE, difference: -1500, differenceType: 'SHORTAGE' })).toBe('Faltante $ 1.500,00');
    expect(officialReview({ ...BASE, difference: 200, differenceType: 'SURPLUS' })).toBe('Sobrante $ 200,00');
    expect(officialReview({ ...BASE, difference: 0, differenceType: 'NONE' })).toBe('Sin diferencia');
  });
});
