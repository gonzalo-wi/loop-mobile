import { buildHistoryQuery, seesAllControls } from '../historyQuery';

describe('buildHistoryQuery', () => {
  it('filters by creation day, so exits created today for tomorrow show up today', () => {
    const query = buildHistoryQuery({ id: 'u1', role: 'ADMIN' }, '2026-10-27');
    expect(query).toEqual({ createdFrom: '2026-10-27', createdTo: '2026-10-27', size: 100 });
  });

  it('limits a controller to the controls they created', () => {
    const query = buildHistoryQuery({ id: 'u1', role: 'CONTROLADOR' }, '2026-10-27');
    expect(query.controllerId).toBe('u1');
  });

  it.each(['ADMIN', 'SUPERVISOR'])('lets %s see everyone’s controls', (role) => {
    expect(buildHistoryQuery({ id: 'u1', role }, '2026-10-27').controllerId).toBeUndefined();
  });
});

describe('seesAllControls', () => {
  it.each([
    ['ADMIN', true],
    ['SUPERVISOR', true],
    ['CONTROLADOR', false],
    ['REPARTIDOR', false],
  ])('%s → %s', (role, expected) => {
    expect(seesAllControls(role)).toBe(expected);
  });
});
