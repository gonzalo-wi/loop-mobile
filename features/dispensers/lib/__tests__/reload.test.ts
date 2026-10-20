import {
  activeLoadsOf,
  alreadyLoadedSerials,
  getReloadConfirmCopy,
  hasLaterLoad,
} from '../reload';
import type { DispenserMovement } from '../../types';

function mov(overrides: Partial<DispenserMovement> = {}): DispenserMovement {
  return {
    id: 'mov-1',
    type: 'LOAD',
    routeCode: '198',
    technician: 'Alan Lauria',
    locationId: 2,
    stateId: 2,
    movementDate: '2026-10-20',
    status: 'SENT_TO_AGUAS',
    serials: ['SN-1'],
    excludedSerials: [],
    aguasMovementId: null,
    registeredBy: 'user-1',
    registeredByUsername: 'alauria',
    createdAt: '2026-10-19T10:00:00',
    updatedAt: '2026-10-19T10:00:00',
    odooStatus: null,
    odooPickingName: null,
    odooPickingId: null,
    odooReference: null,
    ...overrides,
  };
}

const key = { routeCode: ' 198 ', movementDate: '2026-10-20' };

describe('activeLoadsOf', () => {
  it('keeps only active loads of the same route and date', () => {
    const loads = activeLoadsOf(
      [
        mov({ id: 'load' }),
        mov({ id: 'cancelled', status: 'CANCELLED' }),
        mov({ id: 'unload', type: 'UNLOAD' }),
        mov({ id: 'other-route', routeCode: '199' }),
        mov({ id: 'other-date', movementDate: '2026-10-21' }),
      ],
      key,
    );

    expect(loads.map((m) => m.id)).toEqual(['load']);
  });
});

describe('alreadyLoadedSerials', () => {
  it('collects what went out, ignoring case and the serials excluded from those loads', () => {
    const serials = alreadyLoadedSerials([
      mov({ serials: ['sn-1', 'SN-2'], excludedSerials: ['SN-2'] }),
      mov({ id: 'mov-2', serials: ['SN-3'] }),
    ]);

    expect([...serials].sort()).toEqual(['SN-1', 'SN-3']);
  });
});

describe('hasLaterLoad', () => {
  const first = mov({ id: 'first', createdAt: '2026-10-19T10:00:00' });
  const reload = mov({ id: 'reload', createdAt: '2026-10-19T15:30:00' });

  it('is true for a load with a later active load on the same route and date', () => {
    expect(hasLaterLoad(first, [first, reload])).toBe(true);
  });

  it('is false for the last load of the day', () => {
    expect(hasLaterLoad(reload, [first, reload])).toBe(false);
  });

  it('ignores cancelled later loads and unloads', () => {
    expect(hasLaterLoad(first, [first, mov({ ...reload, status: 'CANCELLED' })])).toBe(false);
    expect(hasLaterLoad(mov({ ...first, type: 'UNLOAD' }), [first, reload])).toBe(false);
  });
});

describe('getReloadConfirmCopy', () => {
  it('says how many loads the route already has and what this one adds', () => {
    expect(getReloadConfirmCopy('198', [mov({ serials: ['A', 'B'] })], 3)).toEqual({
      title: 'Esta carga va como recarga',
      message:
        'El reparto 198 ya tiene 1 carga para esta fecha (2 dispensers). Esta se registra como recarga y suma 3 dispensers.',
    });
  });

  it('counts only the dispensers that actually went out', () => {
    expect(
      getReloadConfirmCopy('198', [mov({ serials: ['A', 'B', 'C'], excludedSerials: ['C'] })], 1).message,
    ).toContain('(2 dispensers)');
  });

  it('pluralizes several earlier loads and a single new dispenser', () => {
    expect(
      getReloadConfirmCopy('198', [mov({ serials: ['A'] }), mov({ id: 'b', serials: ['B', 'C'] })], 1).message,
    ).toBe('El reparto 198 ya tiene 2 cargas para esta fecha (3 dispensers). Esta se registra como recarga y suma 1 dispenser.');
  });
});
