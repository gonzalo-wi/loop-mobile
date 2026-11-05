import { depositsReadNote, leadOf, officialReview } from '../lead';
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
    expect(leadOf(BASE)).toEqual({
      tone: 'blue',
      eyebrow: 'Tenés que depositar',
      title: '$ 90.000,00',
      hint: 'Si recién depositaste, actualizá en unos segundos.',
    });
  });

  it('says treasury has no amount yet when the expected cash is missing', () => {
    expect(leadOf({ ...BASE, expectedCash: null }).title).toBe('Tesorería todavía no tiene el monto');
  });

  it('shows what is missing after a short deposit', () => {
    expect(leadOf({ ...BASE, depositedCash: 80000, cashDifference: -10000 })).toEqual({
      tone: 'orange',
      eyebrow: 'Te faltan',
      title: '$ 10.000,00',
      hint: null,
    });
  });

  it('shows what is left over', () => {
    expect(leadOf({ ...BASE, depositedCash: 91500, cashDifference: 1500 })).toEqual({
      tone: 'green',
      eyebrow: 'Te sobran',
      title: '$ 1.500,00',
      hint: null,
    });
  });

  it('never reads a missing field from an older backend as an exact deposit', () => {
    // The casts build what an older backend really sends: the type says the fields exist, the JSON lacks them.
    const fromOldBackend = { ...BASE } as Partial<SettlementFigures>;
    delete fromOldBackend.cashDifference;
    delete fromOldBackend.depositsLive;
    delete fromOldBackend.depositsCheckedAt;

    const lead = leadOf(fromOldBackend as SettlementFigures);

    expect(lead.eyebrow).toBe('Tenés que depositar');
    expect(depositsReadNote(fromOldBackend as SettlementFigures)).toBeNull();
  });

  it('shows the deposit when treasury has no expected cash yet', () => {
    expect(leadOf({ ...BASE, expectedCash: null, depositedCash: 5000 })).toMatchObject({
      eyebrow: 'Depositaste',
      title: '$ 5.000,00',
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

describe('depositsReadNote', () => {
  it('shows when the ATM was read, with seconds, for a live read', () => {
    const note = depositsReadNote({ ...BASE, depositsCheckedAt: '2026-11-05T18:43:09Z', depositsLive: true });

    expect(note?.stale).toBe(false);
    expect(note?.text).toMatch(/^Cajero automático consultado a las \d{2}:\d{2}:09$/);
  });

  it('warns that the last read deposits are shown when the ATM could not be read', () => {
    const note = depositsReadNote({ ...BASE, depositsCheckedAt: '2026-11-05T18:43:09Z', depositsLive: false });

    expect(note?.stale).toBe(true);
    expect(note?.text).toMatch(/^No pudimos consultar el cajero automático ahora\. Mostramos los depósitos leídos a las \d{2}:\d{2}:09\.$/);
  });

  it('warns without a time when there was never a read', () => {
    expect(depositsReadNote({ ...BASE, depositsLive: false })).toEqual({
      stale: true,
      text: 'No pudimos consultar el cajero automático ahora. Mostramos los últimos depósitos registrados.',
    });
  });

  it('says nothing for a live answer without a read time', () => {
    expect(depositsReadNote({ ...BASE, depositsLive: true })).toBeNull();
  });
});
