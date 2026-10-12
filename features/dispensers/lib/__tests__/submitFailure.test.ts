import { findActiveMovement, getSubmitFailureCopy } from '../submitFailure';
import type { DispenserMovement } from '../../types';

function mov(overrides: Partial<DispenserMovement> = {}): DispenserMovement {
  return {
    id: 'mov-1',
    type: 'LOAD',
    routeCode: '198',
    technician: 'Alan Lauria',
    locationId: 2,
    stateId: 2,
    movementDate: '2026-10-02',
    status: 'SENT_TO_AGUAS',
    serials: ['SN-1'],
    excludedSerials: [],
    aguasMovementId: null,
    registeredBy: 'user-1',
    registeredByUsername: 'alauria',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
    odooStatus: null,
    odooPickingName: null,
    odooPickingId: null,
    odooReference: null,
    ...overrides,
  };
}

const target = { type: 'LOAD' as const, routeCode: '198', movementDate: '2026-10-02' };

describe('findActiveMovement', () => {
  it('finds the movement with the same type, route and date', () => {
    expect(findActiveMovement([mov()], target)?.id).toBe('mov-1');
  });

  it('ignores cancelled movements and other types, routes or dates', () => {
    expect(
      findActiveMovement(
        [
          mov({ id: 'cancelled', status: 'CANCELLED' }),
          mov({ id: 'unload', type: 'UNLOAD' }),
          mov({ id: 'other-route', routeCode: '199' }),
          mov({ id: 'other-date', movementDate: '2026-10-03' }),
        ],
        target,
      ),
    ).toBeNull();
  });

  it('compares the route code ignoring surrounding spaces', () => {
    expect(findActiveMovement([mov()], { ...target, routeCode: ' 198 ' })?.id).toBe('mov-1');
  });

  it('compares the stored route code ignoring surrounding spaces', () => {
    expect(findActiveMovement([mov({ routeCode: ' 198  ' })], target)?.id).toBe('mov-1');
  });

  it('returns the first non-cancelled match when several match', () => {
    expect(
      findActiveMovement(
        [
          mov({ id: 'cancelled', status: 'CANCELLED' }),
          mov({ id: 'first' }),
          mov({ id: 'second' }),
        ],
        target,
      )?.id,
    ).toBe('first');
  });

  it('returns null for an empty list', () => {
    expect(findActiveMovement([], target)).toBeNull();
  });
});

describe('getSubmitFailureCopy', () => {
  it('shows a non-ApiError message (no status) as the reason', () => {
    expect(getSubmitFailureCopy(new Error('Boom'), 1).message).toBe(
      'Boom\n\nTu dispenser sigue cargado en esta pantalla.',
    );
  });

  it('treats status 0 as a server answer, not as a missing one', () => {
    expect(getSubmitFailureCopy({ message: 'Sin conexión al servidor', status: 0 }, 1).message).toBe(
      'Sin conexión al servidor\n\nTu dispenser sigue cargado en esta pantalla.',
    );
    expect(getSubmitFailureCopy({ status: 0 }, 1).message).toBe(
      'Intentá de nuevo.\n\nTu dispenser sigue cargado en esta pantalla.',
    );
  });

  it('falls back to the generic sentence when the message is only spaces', () => {
    expect(getSubmitFailureCopy({ message: '   ', status: 500 }, 1).message).toBe(
      'Intentá de nuevo.\n\nTu dispenser sigue cargado en esta pantalla.',
    );
    expect(getSubmitFailureCopy({ message: '   ' }, 1).message).toBe(
      'Intentá de nuevo.\n\nTu dispenser sigue cargado en esta pantalla.',
    );
  });

  it('asks to check the connection when there is no message nor status', () => {
    expect(getSubmitFailureCopy({}, 1).message).toBe(
      'Revisá la conexión e intentá de nuevo. Tu dispenser sigue cargado en esta pantalla.',
    );
  });

  it('uses the plural form when the count is 0', () => {
    expect(getSubmitFailureCopy({ status: 500 }, 0).message).toBe(
      'Intentá de nuevo.\n\nTus 0 dispensers siguen cargados en esta pantalla.',
    );
  });

  it('asks to check the connection when the server could not be reached', () => {
    expect(getSubmitFailureCopy({ message: 'Sin conexión al servidor' }, 3)).toEqual({
      title: 'No se pudo enviar',
      message: 'Revisá la conexión e intentá de nuevo. Tus 3 dispensers siguen cargados en esta pantalla.',
    });
  });

  it('shows the server message when the server answered with an error', () => {
    expect(getSubmitFailureCopy({ message: 'El reparto no existe', status: 400 }, 1)).toEqual({
      title: 'No se pudo enviar',
      message: 'El reparto no existe\n\nTu dispenser sigue cargado en esta pantalla.',
    });
  });

  it('falls back to a generic sentence when there is no message', () => {
    expect(getSubmitFailureCopy({ status: 500 }, 2).message).toBe(
      'Intentá de nuevo.\n\nTus 2 dispensers siguen cargados en esta pantalla.',
    );
  });
});
