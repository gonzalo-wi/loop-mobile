import {
  expectsNoNormalizadoIntake,
  expectsOdooDispatch,
  getExcludedSerials,
  getExclusionNotice,
  shouldSendSerial,
} from '../movementOutcome';
import type { DispenserMovement } from '../../types';

function buildMovement(overrides: Partial<DispenserMovement> = {}): DispenserMovement {
  return {
    id: 'mov-1',
    type: 'UNLOAD',
    routeCode: '199',
    technician: 'Juan Perez',
    locationId: 49,
    stateId: 4,
    movementDate: '2026-09-21',
    status: 'REGISTERED',
    serials: ['SN-OK', 'SN-NN'],
    excludedSerials: [],
    aguasMovementId: null,
    registeredBy: 'user-1',
    registeredByUsername: 'jperez',
    createdAt: '2026-09-21T10:00:00Z',
    updatedAt: '2026-09-21T10:00:00Z',
    odooStatus: null,
    odooPickingName: null,
    odooPickingId: null,
    odooReference: null,
    ...overrides,
  };
}

describe('shouldSendSerial', () => {
  it('en UNLOAD envía también los no normalizados (el backend los deriva a Odoo)', () => {
    expect(shouldSendSerial('UNLOAD', false)).toBe(true);
    expect(shouldSendSerial('UNLOAD', true)).toBe(true);
  });

  it('en LOAD solo envía los registrados', () => {
    expect(shouldSendSerial('LOAD', true)).toBe(true);
    expect(shouldSendSerial('LOAD', false)).toBe(false);
  });
});

describe('getExcludedSerials', () => {
  it('devuelve [] si la respuesta no trae el campo (backend viejo)', () => {
    expect(getExcludedSerials({ excludedSerials: undefined })).toEqual([]);
  });
});

describe('getExclusionNotice', () => {
  it('es null cuando no hay excluidos', () => {
    expect(getExclusionNotice(buildMovement())).toBeNull();
  });

  it('UNLOAD parcial: avisa la derivación sin exigir confirmación', () => {
    const notice = getExclusionNotice(buildMovement({ excludedSerials: ['SN-NN'] }));
    expect(notice).not.toBeNull();
    expect(notice?.requiresConfirmation).toBe(false);
    expect(notice?.message).toContain('SN-NN');
    expect(notice?.message).toContain('no normalizados en Odoo');
  });

  it('UNLOAD total (SKIPPED_UNREGISTERED): diálogo que exige confirmación', () => {
    const notice = getExclusionNotice(
      buildMovement({ status: 'SKIPPED_UNREGISTERED', serials: ['A', 'B'], excludedSerials: ['A', 'B'] }),
    );
    expect(notice?.requiresConfirmation).toBe(true);
    expect(notice?.message).toContain('Ninguno entró a reparación');
    expect(notice?.message).toContain('los 2 dispensers figuran');
  });

  it('LOAD parcial: habla de disponibilidad en Odoo, no de no normalizados', () => {
    const notice = getExclusionNotice(buildMovement({ type: 'LOAD', excludedSerials: ['SN-NN'] }));
    expect(notice?.message).toContain('no está disponible');
    expect(notice?.message).not.toContain('normalizado');
  });

  it('LOAD total: avisa que no se envió nada', () => {
    const notice = getExclusionNotice(
      buildMovement({ type: 'LOAD', status: 'SKIPPED_UNREGISTERED', excludedSerials: ['SN-OK', 'SN-NN'] }),
    );
    expect(notice?.title).toBe('No se envió la carga');
    expect(notice?.requiresConfirmation).toBe(true);
  });
});

describe('expectsOdooDispatch', () => {
  it('LOAD normal espera la salida a Odoo', () => {
    expect(expectsOdooDispatch({ type: 'LOAD', status: 'REGISTERED' })).toBe(true);
  });

  it('LOAD SKIPPED_UNREGISTERED no la espera (odooStatus queda null para siempre)', () => {
    expect(expectsOdooDispatch({ type: 'LOAD', status: 'SKIPPED_UNREGISTERED' })).toBe(false);
  });

  it('UNLOAD nunca', () => {
    expect(expectsOdooDispatch({ type: 'UNLOAD', status: 'SENT_TO_AGUAS' })).toBe(false);
  });
});

describe('expectsNoNormalizadoIntake', () => {
  it('UNLOAD con excluidos, aunque sea SKIPPED_UNREGISTERED', () => {
    expect(
      expectsNoNormalizadoIntake(buildMovement({ status: 'SKIPPED_UNREGISTERED', excludedSerials: ['SN-NN'] })),
    ).toBe(true);
  });

  it('no aplica sin excluidos, en LOAD ni si está cancelado', () => {
    expect(expectsNoNormalizadoIntake(buildMovement())).toBe(false);
    expect(expectsNoNormalizadoIntake(buildMovement({ type: 'LOAD', excludedSerials: ['X'] }))).toBe(false);
    expect(expectsNoNormalizadoIntake(buildMovement({ status: 'CANCELLED', excludedSerials: ['X'] }))).toBe(false);
  });
});
