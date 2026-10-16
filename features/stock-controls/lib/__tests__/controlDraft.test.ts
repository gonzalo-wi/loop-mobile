import {
  buildDraft,
  draftFileName,
  hasDraftContent,
  parseDraft,
  parseLocalDate,
  type DraftInput,
} from '../controlDraft';
import type { ProductControlValues, Route } from '../../types';

const EMPTY: ProductControlValues = {
  full: { bundles: 0, looseUnits: 0, totalUnits: 0 },
  total: { bundles: 0, looseUnits: 0, totalUnits: 0 },
  exchanges: 0,
  observations: '',
};

const ROUTE = { id: 'r1', code: '49', branchId: 'b1', branchName: 'Ciudadela' } as Route;

function input(overrides: Partial<DraftInput> = {}): DraftInput {
  return {
    userId: 'u1',
    type: 'ENTRY',
    route: null,
    truckOrdered: true,
    observations: '',
    controlDate: new Date(2026, 9, 15),
    formValues: { p1: EMPTY, p2: EMPTY },
    ...overrides,
  };
}

const NOW = new Date(2026, 9, 15, 14, 32);

describe('hasDraftContent', () => {
  it('es false con el formulario recién abierto', () => {
    expect(hasDraftContent(input())).toBe(false);
  });

  it('es true al elegir reparto', () => {
    expect(hasDraftContent(input({ route: ROUTE }))).toBe(true);
  });

  it('es true con observaciones generales', () => {
    expect(hasDraftContent(input({ observations: 'falta un pallet' }))).toBe(true);
  });

  it('es true con alguna cantidad cargada', () => {
    const p1 = { ...EMPTY, exchanges: 2 };
    expect(hasDraftContent(input({ formValues: { p1, p2: EMPTY } }))).toBe(true);
  });

  it('es true con observaciones de un producto', () => {
    const p1 = { ...EMPTY, observations: 'roto' };
    expect(hasDraftContent(input({ formValues: { p1 } }))).toBe(true);
  });

  it('ignora observaciones que son solo espacios', () => {
    expect(hasDraftContent(input({ observations: '   ' }))).toBe(false);
  });
});

describe('buildDraft / parseDraft', () => {
  it('recupera el mismo control guardado hoy', () => {
    const p1 = { ...EMPTY, total: { bundles: 0, looseUnits: 5, totalUnits: 5 } };
    const raw = JSON.stringify(buildDraft(input({ route: ROUTE, formValues: { p1 } }), NOW));

    const draft = parseDraft(raw, { userId: 'u1', type: 'ENTRY' }, new Date(2026, 9, 15, 18, 0));

    expect(draft?.route?.code).toBe('49');
    expect(draft?.formValues.p1.total.totalUnits).toBe(5);
    expect(draft?.controlDate).toBe('2026-10-15');
    expect(draft?.savedAt).toBe(NOW.toISOString());
  });

  it('descarta un borrador de otro día', () => {
    const raw = JSON.stringify(buildDraft(input({ route: ROUTE }), NOW));
    expect(parseDraft(raw, { userId: 'u1', type: 'ENTRY' }, new Date(2026, 9, 16, 0, 5))).toBeNull();
  });

  it('descarta un borrador de otro usuario o de otro tipo', () => {
    const raw = JSON.stringify(buildDraft(input({ route: ROUTE }), NOW));
    expect(parseDraft(raw, { userId: 'u2', type: 'ENTRY' }, NOW)).toBeNull();
    expect(parseDraft(raw, { userId: 'u1', type: 'EXIT' }, NOW)).toBeNull();
  });

  it('descarta contenido vacío, ilegible o de otra versión', () => {
    expect(parseDraft(null, { userId: 'u1', type: 'ENTRY' }, NOW)).toBeNull();
    expect(parseDraft('{no es json', { userId: 'u1', type: 'ENTRY' }, NOW)).toBeNull();
    const old = { ...buildDraft(input({ route: ROUTE }), NOW), version: 0 };
    expect(parseDraft(JSON.stringify(old), { userId: 'u1', type: 'ENTRY' }, NOW)).toBeNull();
  });
});

describe('parseLocalDate', () => {
  it('interpreta YYYY-MM-DD como fecha local, sin correrse por zona horaria', () => {
    const d = parseLocalDate('2026-10-16');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 16]);
  });
});

describe('draftFileName', () => {
  it('separa borradores por usuario y tipo', () => {
    expect(draftFileName('u1', 'EXIT')).not.toBe(draftFileName('u1', 'ENTRY'));
    expect(draftFileName('u1', 'EXIT')).not.toBe(draftFileName('u2', 'EXIT'));
  });
});
