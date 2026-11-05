import { checkSettlementNews, markSettlementSeen, startSettlementWatcher } from '../watcher';
import type { DriverSettlement } from '../../types';

const DEPOSITED: DriverSettlement = {
  date: '2026-11-05',
  routes: [
    {
      routeId: 'r1',
      routeCode: 'Rto 179',
      state: 'AVAILABLE',
      figures: {
        expectedCash: 90000,
        expectedChecks: 0,
        expectedWithholdings: 0,
        expectedTotal: 90000,
        depositedCash: 91500,
        confirmedChecks: 0,
        confirmedWithholdings: 0,
        totalReceived: 91500,
        difference: null,
        differenceType: null,
        statusGroup: 'PENDING',
        expectedUpdatedAt: null,
        lastDepositAt: '2026-11-05T18:42:00Z',
        cashDifference: 1500,
        depositsCheckedAt: '2026-11-05T18:43:00Z',
        depositsLive: true,
      },
    },
  ],
};

function fakeAppState(initial: string) {
  let listener: ((state: string) => void) | null = null;
  const remove = jest.fn(() => {
    listener = null;
  });
  return {
    currentState: initial,
    addEventListener: jest.fn((_type: 'change', l: (state: string) => void) => {
      listener = l;
      return { remove };
    }),
    emit: (state: string) => listener?.(state),
    remove,
  };
}

describe('startSettlementWatcher', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('checks at once and then every interval while active', () => {
    const check = jest.fn(() => Promise.resolve());
    const stop = startSettlementWatcher({ check, appState: fakeAppState('active'), intervalMs: 1000 });

    expect(check).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(3000);
    expect(check).toHaveBeenCalledTimes(4);
    stop();
  });

  it('does nothing while the app starts in the background', () => {
    const check = jest.fn(() => Promise.resolve());
    const stop = startSettlementWatcher({ check, appState: fakeAppState('background'), intervalMs: 1000 });

    jest.advanceTimersByTime(5000);
    expect(check).not.toHaveBeenCalled();
    stop();
  });

  it('stops in the background and checks again when the app comes back', () => {
    const check = jest.fn(() => Promise.resolve());
    const appState = fakeAppState('active');
    const stop = startSettlementWatcher({ check, appState, intervalMs: 1000 });

    appState.emit('background');
    jest.advanceTimersByTime(5000);
    expect(check).toHaveBeenCalledTimes(1);

    appState.emit('active');
    expect(check).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(1000);
    expect(check).toHaveBeenCalledTimes(3);
    stop();
  });

  it('never runs two intervals when "active" arrives twice', () => {
    const check = jest.fn(() => Promise.resolve());
    const appState = fakeAppState('active');
    const stop = startSettlementWatcher({ check, appState, intervalMs: 1000 });

    appState.emit('active');
    jest.advanceTimersByTime(1000);
    expect(check).toHaveBeenCalledTimes(2);
    stop();
  });

  it('clears the interval and the listener on cleanup', () => {
    const check = jest.fn(() => Promise.resolve());
    const appState = fakeAppState('active');
    const stop = startSettlementWatcher({ check, appState, intervalMs: 1000 });

    stop();
    jest.advanceTimersByTime(5000);
    expect(check).toHaveBeenCalledTimes(1);
    expect(appState.remove).toHaveBeenCalledTimes(1);
  });
});

describe('checkSettlementNews', () => {
  it('turns the badge on for a deposit not seen yet', async () => {
    const setUnseen = jest.fn();
    await checkSettlementNews({ fetchSettlement: async () => DEPOSITED, getSeen: async () => [], setUnseen });

    expect(setUnseen).toHaveBeenCalledWith(true);
  });

  it('keeps the badge off when the deposit was already seen', async () => {
    const setUnseen = jest.fn();
    const seen: string[] = [];
    await markSettlementSeen(DEPOSITED, { saveSeen: async (s) => void seen.push(...s), setUnseen: jest.fn() });

    await checkSettlementNews({ fetchSettlement: async () => DEPOSITED, getSeen: async () => seen, setUnseen });

    expect(setUnseen).toHaveBeenCalledWith(false);
  });

  it('leaves the badge alone when the check fails', async () => {
    const setUnseen = jest.fn();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    await checkSettlementNews({
      fetchSettlement: async () => Promise.reject(new Error('offline')),
      getSeen: async () => [],
      setUnseen,
    });

    expect(setUnseen).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('markSettlementSeen', () => {
  it('turns the badge off and saves what the screen shows', async () => {
    const setUnseen = jest.fn();
    const saveSeen = jest.fn(() => Promise.resolve());

    await markSettlementSeen(DEPOSITED, { saveSeen, setUnseen });

    expect(setUnseen).toHaveBeenCalledWith(false);
    expect(saveSeen).toHaveBeenCalledWith([expect.stringContaining('r1|deposit')]);
  });

  it('never fails the screen when saving fails', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(
      markSettlementSeen(DEPOSITED, { saveSeen: () => Promise.reject(new Error('full')), setUnseen: jest.fn() }),
    ).resolves.toBeUndefined();
    warn.mockRestore();
  });
});
