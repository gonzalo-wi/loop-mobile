import type { DriverSettlement } from '../types';
import { hasUnseenNews, settlementNews } from './seen';

export const SETTLEMENT_CHECK_MS = 5 * 60 * 1000;

type AppStateLike = {
  currentState: string;
  addEventListener: (type: 'change', listener: (state: string) => void) => { remove: () => void };
};

type WatcherDeps = {
  check: () => Promise<void>;
  appState: AppStateLike;
  intervalMs?: number;
};

/**
 * Checks right away and every 5 minutes while the app is in the foreground; stops in the background and
 * checks again when it comes back. Returns the cleanup. Kept outside React so the lifecycle is tested.
 */
export function startSettlementWatcher({ check, appState, intervalMs = SETTLEMENT_CHECK_MS }: WatcherDeps): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;
  const start = () => {
    if (timer) return;
    void check();
    timer = setInterval(() => void check(), intervalMs);
  };
  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
  if (appState.currentState === 'active') start();
  const subscription = appState.addEventListener('change', (state) => (state === 'active' ? start() : stop()));
  return () => {
    stop();
    subscription.remove();
  };
}

type CheckDeps = {
  fetchSettlement: () => Promise<DriverSettlement>;
  getSeen: () => Promise<string[]>;
  setUnseen: (unseen: boolean) => void;
};

/** One background check: turns the badge on or off. A failure leaves the badge as it was. */
export async function checkSettlementNews({ fetchSettlement, getSeen, setUnseen }: CheckDeps): Promise<void> {
  try {
    const [settlement, seen] = await Promise.all([fetchSettlement(), getSeen()]);
    setUnseen(hasUnseenNews(settlementNews(settlement), seen));
  } catch (e) {
    console.warn('Settlement background check failed', e);
  }
}

type MarkSeenDeps = {
  saveSeen: (seen: string[]) => Promise<void>;
  setUnseen: (unseen: boolean) => void;
};

/**
 * The driver is looking at the screen: whatever it shows counts as seen. Only today's items are saved, so the
 * stored list stays small. Failing to save only means the badge may come back; it never fails the screen.
 */
export async function markSettlementSeen(settlement: DriverSettlement, { saveSeen, setUnseen }: MarkSeenDeps): Promise<void> {
  setUnseen(false);
  try {
    await saveSeen(settlementNews(settlement));
  } catch (e) {
    console.warn('Could not save the seen settlement news', e);
  }
}
