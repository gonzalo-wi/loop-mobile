import { isAwaitingSystems } from '../registrationFollowUp';
import type { DispenserMovement } from '../../types';

function mov(overrides: Partial<DispenserMovement> = {}): DispenserMovement {
  return {
    id: 'mov-1',
    type: 'LOAD',
    routeCode: '179',
    technician: 'Juan',
    locationId: 2,
    stateId: 2,
    movementDate: '2026-10-12',
    status: 'SENT_TO_AGUAS',
    serials: ['SN-1'],
    excludedSerials: [],
    aguasMovementId: null,
    registeredBy: 'u',
    registeredByUsername: 'juan',
    createdAt: '2026-10-12T10:00:00Z',
    updatedAt: '2026-10-12T10:00:00Z',
    odooStatus: 'SENT',
    odooPickingName: null,
    odooPickingId: null,
    odooReference: null,
    ...overrides,
  };
}

describe('isAwaitingSystems', () => {
  it('waits while Aguas is still being sent, for loads and unloads', () => {
    expect(isAwaitingSystems(mov({ status: 'REGISTERED' }))).toBe(true);
    expect(isAwaitingSystems(mov({ type: 'UNLOAD', status: 'REGISTERED' }))).toBe(true);
  });

  it('waits for Odoo on a load until it answers', () => {
    expect(isAwaitingSystems(mov({ odooStatus: null }))).toBe(true);
    expect(isAwaitingSystems(mov({ odooStatus: 'ERROR' }))).toBe(false);
  });

  it('waits for the non-normalized intake of an unload with excluded serials', () => {
    const unload = { type: 'UNLOAD' as const, excludedSerials: ['SN-1'] };
    expect(isAwaitingSystems(mov({ ...unload, odooNoNormalizadoStatus: null }))).toBe(true);
    expect(isAwaitingSystems(mov({ ...unload, odooNoNormalizadoStatus: 'SENT' }))).toBe(false);
  });

  it('does not wait when nothing was sent to Aguas (final state)', () => {
    expect(isAwaitingSystems(mov({ status: 'SKIPPED_UNREGISTERED', odooStatus: null }))).toBe(false);
  });

  it('does not wait once every system answered', () => {
    expect(isAwaitingSystems(mov())).toBe(false);
    expect(isAwaitingSystems(mov({ type: 'UNLOAD', odooStatus: null }))).toBe(false);
  });
});
