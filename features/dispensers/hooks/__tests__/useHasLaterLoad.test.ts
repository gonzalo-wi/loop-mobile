/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { useHasLaterLoad } from '../useHasLaterLoad';
import { getDispenserMovements } from '../../services/dispenserApi';
import type { DispenserMovement } from '../../types';

jest.mock('../../services/dispenserApi', () => ({
  getDispenserMovements: jest.fn(),
}));

const mockGetMovements = getDispenserMovements as jest.MockedFunction<typeof getDispenserMovements>;

function load(overrides: Partial<DispenserMovement> = {}): DispenserMovement {
  return {
    id: 'first',
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

const reload = load({ id: 'reload', createdAt: '2026-10-19T15:00:00' });

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  mockGetMovements.mockReset();
});

afterEach(() => jest.restoreAllMocks());

describe('useHasLaterLoad', () => {
  it('is checking first and then later when a later load exists for the same route and date', async () => {
    const first = load();
    mockGetMovements.mockResolvedValue({ movements: [first, reload], totalElements: 2 });

    const { result } = renderHook(() => useHasLaterLoad(first));

    expect(result.current.state).toBe('checking');
    await waitFor(() => expect(result.current.state).toBe('later'));
  });

  it('is last for an unload without asking', () => {
    const { result } = renderHook(() => useHasLaterLoad(load({ type: 'UNLOAD' })));

    expect(result.current.state).toBe('last');
    expect(mockGetMovements).not.toHaveBeenCalled();
  });

  it('is last when the lookup fails (the backend still refuses with 409)', async () => {
    mockGetMovements.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useHasLaterLoad(load()));

    await waitFor(() => expect(result.current.state).toBe('last'));
  });

  it('recheck finds a recarga registered while the detail was open', async () => {
    const first = load();
    mockGetMovements.mockResolvedValueOnce({ movements: [first], totalElements: 1 });
    const { result } = renderHook(() => useHasLaterLoad(first));
    await waitFor(() => expect(result.current.state).toBe('last'));

    mockGetMovements.mockResolvedValueOnce({ movements: [first, reload], totalElements: 2 });
    let later = false;
    await act(async () => {
      later = await result.current.recheck();
    });

    expect(later).toBe(true);
    expect(result.current.state).toBe('later');
  });
});
