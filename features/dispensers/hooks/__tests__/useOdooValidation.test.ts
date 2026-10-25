/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { useOdooValidation } from '../useOdooValidation';
import { validateOdooEquipment } from '../../services/odooApi';
import type { DispenserMovementType, OdooValidationResult } from '../../types';

jest.mock('../../services/odooApi', () => ({
  validateOdooEquipment: jest.fn(),
}));

const mockValidate = validateOdooEquipment as jest.MockedFunction<typeof validateOdooEquipment>;

const DEBOUNCE_MS = 900;

function answer(serie: string, disponible: boolean): OdooValidationResult {
  return { serie, disponible, motivo: null, serie_odoo: null, ubicacion: null };
}

type Deferred<T> = { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void };

function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

type Props = { type: DispenserMovementType; codes: string[] };

function setup(initial: Props) {
  return renderHook((props: Props) => useOdooValidation(props.type, props.codes), {
    initialProps: initial,
  });
}

async function advance(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockValidate.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useOdooValidation', () => {
  it('is validating until the debounced request answers, then exposes the results', async () => {
    mockValidate.mockResolvedValue([answer('A', false)]);
    const { result } = setup({ type: 'LOAD', codes: ['A'] });

    expect(result.current.status).toBe('validating');
    expect(mockValidate).not.toHaveBeenCalled();

    await advance(DEBOUNCE_MS);

    expect(mockValidate).toHaveBeenCalledTimes(1);
    expect(mockValidate).toHaveBeenCalledWith(['A']);
    expect(result.current.status).toBe('done');
    expect(result.current.results.get('A')?.disponible).toBe(false);
  });

  it('debounces: a burst of scans results in a single request with the full list', async () => {
    mockValidate.mockResolvedValue([answer('A', true), answer('B', true), answer('C', true)]);
    const { rerender } = setup({ type: 'LOAD', codes: ['A'] });

    await advance(DEBOUNCE_MS - 100);
    rerender({ type: 'LOAD', codes: ['A', 'B'] });
    await advance(DEBOUNCE_MS - 100);
    rerender({ type: 'LOAD', codes: ['A', 'B', 'C'] });
    expect(mockValidate).not.toHaveBeenCalled();

    await advance(DEBOUNCE_MS);

    expect(mockValidate).toHaveBeenCalledTimes(1);
    expect(mockValidate).toHaveBeenCalledWith(['A', 'B', 'C']);
  });

  it('does not re-request when rerendered with a new array of the same codes', async () => {
    mockValidate.mockResolvedValue([answer('A', true)]);
    const { rerender, result } = setup({ type: 'LOAD', codes: ['A'] });
    await advance(DEBOUNCE_MS);

    rerender({ type: 'LOAD', codes: ['A'] });
    await advance(DEBOUNCE_MS);

    expect(mockValidate).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('done');
  });

  it('discards a stale response: an older answer cannot settle a newer list', async () => {
    const first = deferred<OdooValidationResult[]>();
    const second = deferred<OdooValidationResult[]>();
    mockValidate.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const { result, rerender } = setup({ type: 'LOAD', codes: ['A'] });
    await advance(DEBOUNCE_MS); // request 1 in flight

    rerender({ type: 'LOAD', codes: ['A', 'B'] });
    await advance(DEBOUNCE_MS); // request 2 in flight
    expect(mockValidate).toHaveBeenCalledTimes(2);

    // The older answer (only knows A) arrives late and says everything is fine.
    await act(async () => {
      first.resolve([answer('A', true)]);
    });
    expect(result.current.status).toBe('validating');
    expect(result.current.results.size).toBe(0);

    await act(async () => {
      second.resolve([answer('A', true), answer('B', false)]);
    });
    expect(result.current.status).toBe('done');
    expect(result.current.results.get('B')?.disponible).toBe(false);
  });

  it('discards a stale response even when it arrives after the newer one', async () => {
    const first = deferred<OdooValidationResult[]>();
    const second = deferred<OdooValidationResult[]>();
    mockValidate.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const { result, rerender } = setup({ type: 'LOAD', codes: ['A'] });
    await advance(DEBOUNCE_MS);
    rerender({ type: 'LOAD', codes: ['A', 'B'] });
    await advance(DEBOUNCE_MS);

    await act(async () => {
      second.resolve([answer('A', true), answer('B', false)]);
    });
    await act(async () => {
      first.resolve([answer('A', true)]);
    });

    expect(result.current.status).toBe('done');
    expect(result.current.results.get('B')?.disponible).toBe(false);
  });

  it('turns into failed (not blocking) when the request rejects', async () => {
    mockValidate.mockRejectedValue(new Error('network'));
    const { result } = setup({ type: 'LOAD', codes: ['A'] });

    await advance(DEBOUNCE_MS);

    expect(result.current.status).toBe('failed');
    expect(result.current.results.size).toBe(0);
  });

  it('ignores a stale failure from an older list', async () => {
    const first = deferred<OdooValidationResult[]>();
    const second = deferred<OdooValidationResult[]>();
    mockValidate.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const { result, rerender } = setup({ type: 'LOAD', codes: ['A'] });
    await advance(DEBOUNCE_MS);
    rerender({ type: 'LOAD', codes: ['A', 'B'] });
    await advance(DEBOUNCE_MS);

    await act(async () => {
      first.reject(new Error('timeout'));
    });
    expect(result.current.status).toBe('validating');

    await act(async () => {
      second.resolve([answer('A', true), answer('B', true)]);
    });
    expect(result.current.status).toBe('done');
  });

  it('goes back to validating when a serial is added after a settled answer', async () => {
    mockValidate.mockResolvedValue([answer('A', true)]);
    const { result, rerender } = setup({ type: 'LOAD', codes: ['A'] });
    await advance(DEBOUNCE_MS);
    expect(result.current.status).toBe('done');

    rerender({ type: 'LOAD', codes: ['A', 'B'] });
    expect(result.current.status).toBe('validating');
  });

  it('is done and clears results for an empty list without calling Odoo', async () => {
    mockValidate.mockResolvedValue([answer('A', false)]);
    const { result, rerender } = setup({ type: 'LOAD', codes: ['A'] });
    await advance(DEBOUNCE_MS);
    expect(result.current.results.size).toBe(1);

    rerender({ type: 'LOAD', codes: [] });
    await advance(DEBOUNCE_MS);

    expect(result.current.status).toBe('done');
    expect(result.current.results.size).toBe(0);
    expect(mockValidate).toHaveBeenCalledTimes(1);
  });

  it('never validates on UNLOAD and reports done', async () => {
    const { result } = setup({ type: 'UNLOAD', codes: ['A'] });

    await advance(DEBOUNCE_MS);

    expect(mockValidate).not.toHaveBeenCalled();
    expect(result.current.status).toBe('done');
  });

  it('ignores an in-flight LOAD response once the type switched to UNLOAD', async () => {
    const inFlight = deferred<OdooValidationResult[]>();
    mockValidate.mockReturnValue(inFlight.promise);

    const { result, rerender } = setup({ type: 'LOAD', codes: ['A'] });
    await advance(DEBOUNCE_MS);
    rerender({ type: 'UNLOAD', codes: ['A'] });
    await act(async () => {
      inFlight.resolve([answer('A', false)]);
    });

    expect(result.current.results.size).toBe(0);
  });
});
