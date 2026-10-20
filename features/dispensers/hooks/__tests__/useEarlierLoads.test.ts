/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { useEarlierLoads, type EarlierLoadsRefresh } from '../useEarlierLoads';
import { getDispenserMovements } from '../../services/dispenserApi';
import type { DispenserMovement } from '../../types';

jest.mock('../../services/dispenserApi', () => ({
  getDispenserMovements: jest.fn(),
}));

const mockGetMovements = getDispenserMovements as jest.MockedFunction<typeof getDispenserMovements>;

function load(overrides: Partial<DispenserMovement> = {}): DispenserMovement {
  return {
    id: 'load-1',
    type: 'LOAD',
    routeCode: '198',
    technician: 'Tech',
    locationId: 2,
    stateId: 2,
    movementDate: '2026-10-20',
    status: 'SENT_TO_AGUAS',
    serials: ['SN-1'],
    excludedSerials: [],
    aguasMovementId: null,
    registeredBy: 'u',
    registeredByUsername: 'u',
    createdAt: '2026-10-19T10:00:00',
    updatedAt: '2026-10-19T10:00:00',
    odooStatus: null,
    odooPickingName: null,
    odooPickingId: null,
    odooReference: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.useFakeTimers();
  mockGetMovements.mockReset();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('useEarlierLoads', () => {
  it('loads the active loads of the route and date after the debounce', async () => {
    mockGetMovements.mockResolvedValue({
      movements: [load(), load({ id: 'cancelled', status: 'CANCELLED' })],
      totalElements: 2,
    });

    const { result } = renderHook(() => useEarlierLoads('LOAD', '198', '2026-10-20'));
    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => expect(result.current.loads.map((m) => m.id)).toEqual(['load-1']));
    expect(mockGetMovements).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'LOAD', routeCode: '198', from: '2026-10-20', to: '2026-10-20' }),
    );
  });

  it('does not look anything up for an unload or without a route', () => {
    renderHook(() => useEarlierLoads('UNLOAD', '198', '2026-10-20'));
    renderHook(() => useEarlierLoads('LOAD', '  ', '2026-10-20'));
    act(() => {
      jest.runAllTimers();
    });

    expect(mockGetMovements).not.toHaveBeenCalled();
  });

  it('refresh returns fresh loads right away', async () => {
    mockGetMovements.mockResolvedValue({ movements: [load()], totalElements: 1 });
    const { result } = renderHook(() => useEarlierLoads('LOAD', '198', '2026-10-20'));

    let fresh: EarlierLoadsRefresh | undefined;
    await act(async () => {
      fresh = await result.current.refresh();
    });

    expect(fresh?.ok).toBe(true);
    expect(fresh?.loads.map((m) => m.id)).toEqual(['load-1']);
  });

  it('keeps the loads it already knew when a later refresh fails', async () => {
    mockGetMovements.mockResolvedValueOnce({ movements: [load()], totalElements: 1 });
    const { result } = renderHook(() => useEarlierLoads('LOAD', '198', '2026-10-20'));
    act(() => {
      jest.runAllTimers();
    });
    await waitFor(() => expect(result.current.loads).toHaveLength(1));

    mockGetMovements.mockRejectedValueOnce(new Error('timeout'));
    let fresh: EarlierLoadsRefresh | undefined;
    await act(async () => {
      fresh = await result.current.refresh();
    });

    expect(fresh?.ok).toBe(false);
    expect(fresh?.loads.map((m) => m.id)).toEqual(['load-1']);
    expect(result.current.loads.map((m) => m.id)).toEqual(['load-1']);
  });

  it('answers no earlier loads when the very first lookup fails', async () => {
    mockGetMovements.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useEarlierLoads('LOAD', '198', '2026-10-20'));

    let fresh: EarlierLoadsRefresh | undefined;
    await act(async () => {
      fresh = await result.current.refresh();
    });

    expect(fresh).toEqual({ ok: false, loads: [] });
  });
});
