import { noNormalizadoPending, pollOdooStatus } from '../useOdooPolling';
import { getDispenserMovement } from '../../services/dispenserApi';
import type { DispenserMovement } from '../../types';

jest.mock('../../services/dispenserApi', () => ({
  getDispenserMovement: jest.fn(),
}));

const mockedGetDispenserMovement = getDispenserMovement as jest.MockedFunction<
  typeof getDispenserMovement
>;

function buildMovement(overrides: Partial<DispenserMovement> = {}): DispenserMovement {
  return {
    id: 'mov-1',
    type: 'LOAD',
    routeCode: 'R-001',
    technician: 'Juan Perez',
    locationId: 1,
    stateId: 1,
    movementDate: '2026-08-10',
    status: 'REGISTERED',
    serials: ['SN-001'],
    aguasMovementId: null,
    registeredBy: 'user-1',
    registeredByUsername: 'jperez',
    createdAt: '2026-08-10T10:00:00Z',
    updatedAt: '2026-08-10T10:00:00Z',
    odooStatus: null,
    odooPickingName: null,
    odooPickingId: null,
    odooReference: null,
    ...overrides,
  };
}

// Helper: corre pollOdooStatus mientras se van avanzando los fake timers,
// hasta que la promesa se resuelva (o rechace).
async function runWithFakeTimers<T>(promise: Promise<T>, intervalMs: number, maxSteps = 20): Promise<T> {
  let resolved = false;
  let result: T;
  let error: unknown;

  promise.then(
    (r) => {
      resolved = true;
      result = r;
    },
    (e) => {
      resolved = true;
      error = e;
    },
  );

  for (let i = 0; i < maxSteps && !resolved; i++) {
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(intervalMs);
  }
  // flush microtasks finales
  await Promise.resolve();

  if (error) throw error;
  return result!;
}

describe('pollOdooStatus', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reintenta mientras odooStatus === null y corta apenas deja de ser null', async () => {
    mockedGetDispenserMovement
      .mockResolvedValueOnce(buildMovement({ odooStatus: null }))
      .mockResolvedValueOnce(buildMovement({ odooStatus: null }))
      .mockResolvedValueOnce(buildMovement({ odooStatus: 'SENT', odooPickingName: 'WH/OUT/001' }));

    const promise = pollOdooStatus('mov-1', { intervalMs: 10, maxAttempts: 5 });
    const result = await runWithFakeTimers(promise, 10);

    expect(mockedGetDispenserMovement).toHaveBeenCalledTimes(3);
    expect(result.odooStatus).toBe('SENT');
    expect(result.odooPickingName).toBe('WH/OUT/001');
  });

  it('resuelve en el primer intento si odooStatus ya viene distinto de null', async () => {
    mockedGetDispenserMovement.mockResolvedValueOnce(
      buildMovement({ odooStatus: 'ERROR' }),
    );

    const promise = pollOdooStatus('mov-1', { intervalMs: 10, maxAttempts: 5 });
    const result = await runWithFakeTimers(promise, 10);

    expect(mockedGetDispenserMovement).toHaveBeenCalledTimes(1);
    expect(result.odooStatus).toBe('ERROR');
  });

  it('respeta maxAttempts y devuelve el último movimiento (odooStatus aún null) si se agota la ventana', async () => {
    mockedGetDispenserMovement.mockResolvedValue(buildMovement({ odooStatus: null }));

    const promise = pollOdooStatus('mov-1', { intervalMs: 10, maxAttempts: 3 });
    const result = await runWithFakeTimers(promise, 10);

    expect(mockedGetDispenserMovement).toHaveBeenCalledTimes(3);
    expect(result.odooStatus).toBeNull();
  });

  it('con isPending=noNormalizadoPending espera la derivación de no normalizados, no la salida', async () => {
    mockedGetDispenserMovement
      .mockResolvedValueOnce(buildMovement({ type: 'UNLOAD', odooNoNormalizadoStatus: null }))
      .mockResolvedValueOnce(
        buildMovement({ type: 'UNLOAD', odooNoNormalizadoStatus: 'SENT', odooNoNormalizadoPickingName: 'AC/FCNN/00001' }),
      );

    const promise = pollOdooStatus('mov-1', { intervalMs: 10, maxAttempts: 5, isPending: noNormalizadoPending });
    const result = await runWithFakeTimers(promise, 10);

    expect(mockedGetDispenserMovement).toHaveBeenCalledTimes(2);
    expect(result.odooNoNormalizadoStatus).toBe('SENT');
    // odooStatus sigue en null (UNLOAD sin salida): con el default habría seguido esperando.
    expect(result.odooStatus).toBeNull();
  });

  it('llama a getDispenserMovement con el id correcto', async () => {
    mockedGetDispenserMovement.mockResolvedValueOnce(buildMovement({ odooStatus: 'SENT' }));

    const promise = pollOdooStatus('mov-42', { intervalMs: 10, maxAttempts: 5 });
    await runWithFakeTimers(promise, 10);

    expect(mockedGetDispenserMovement).toHaveBeenCalledWith('mov-42');
  });

  it('es cancelable vía AbortSignal: si se aborta durante la espera, corta y no sigue haciendo requests', async () => {
    mockedGetDispenserMovement.mockResolvedValue(buildMovement({ odooStatus: null }));

    const controller = new AbortController();
    const promise = pollOdooStatus('mov-1', {
      intervalMs: 10,
      maxAttempts: 10,
      signal: controller.signal,
    });
    // Evita que el rechazo por abort quede como unhandled antes del expect.
    promise.catch(() => {});

    // Deja que se resuelva el primer fetch (fuera del loop de wait) y entre al loop.
    await Promise.resolve();
    await Promise.resolve();

    const callsBeforeAbort = mockedGetDispenserMovement.mock.calls.length;
    controller.abort();

    // El wait() rechaza con AbortError apenas se aborta la señal (no hace
    // falta avanzar el timer): pollOdooStatus no atrapa ese rechazo, así que
    // la promesa se rechaza en vez de resolver con el último movimiento.
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });

    expect(mockedGetDispenserMovement.mock.calls.length).toBe(callsBeforeAbort);

    // Avanzamos más timers para confirmar que efectivamente no se siguen
    // disparando requests luego del abort.
    await jest.advanceTimersByTimeAsync(1000);
    expect(mockedGetDispenserMovement.mock.calls.length).toBe(callsBeforeAbort);
  });

  it('si se aborta antes de arrancar el loop de espera (chequeo temprano), devuelve el movimiento sin más requests', async () => {
    mockedGetDispenserMovement.mockResolvedValueOnce(buildMovement({ odooStatus: null }));

    const controller = new AbortController();
    controller.abort();

    // El primer fetch ya se hace sin chequear el signal, pero el chequeo
    // `if (signal?.aborted) return movement;` dentro del for corta antes de esperar.
    const result = await pollOdooStatus('mov-1', {
      intervalMs: 10,
      maxAttempts: 10,
      signal: controller.signal,
    });

    expect(mockedGetDispenserMovement).toHaveBeenCalledTimes(1);
    expect(result.odooStatus).toBeNull();
  });
});
