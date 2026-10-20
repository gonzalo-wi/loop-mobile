import { useCallback, useEffect, useRef, useState } from 'react';
import { getDispenserMovements } from '../services/dispenserApi';
import { activeLoadsOf } from '../lib/reload';
import type { DispenserMovement, DispenserMovementType } from '../types';

// Waits for the route code to settle before asking, since it is typed digit by digit.
const LOOKUP_DEBOUNCE_MS = 500;
// A route gets a handful of loads a day; this is a ceiling, not a page.
const MAX_LOADS = 50;

export type EarlierLoadsRefresh = { ok: true; loads: DispenserMovement[] } | { ok: false; loads: DispenserMovement[] };

/**
 * Active loads already registered for the route and date, so a new LOAD can be shown as a recarga
 * and serials that already went out can be flagged. A failed lookup keeps what was known before:
 * the backend still rejects repeated serials, so the screen never blocks on it.
 */
export function useEarlierLoads(type: DispenserMovementType, routeCode: string, movementDate: string) {
  const [loads, setLoads] = useState<DispenserMovement[]>([]);
  const route = routeCode.trim();
  const enabled = type === 'LOAD' && route.length > 0;
  const lookupKey = enabled ? `${route}|${movementDate}` : null;
  // A late answer for a route the operator already changed must not overwrite the current one.
  const currentKey = useRef(lookupKey);
  currentKey.current = lookupKey;

  const fetchLoads = useCallback(async (): Promise<DispenserMovement[]> => {
    const { movements } = await getDispenserMovements({
      type: 'LOAD',
      routeCode: route,
      from: movementDate,
      to: movementDate,
      size: MAX_LOADS,
    });
    return activeLoadsOf(movements, { routeCode: route, movementDate });
  }, [route, movementDate]);

  useEffect(() => {
    setLoads([]);
    if (!lookupKey) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchLoads()
        .then((fresh) => {
          if (!cancelled) setLoads(fresh);
        })
        .catch((e: unknown) => {
          console.warn('Earlier loads lookup failed', e);
        });
    }, LOOKUP_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [lookupKey, fetchLoads]);

  /** Asks again now (e.g. right before submitting). On failure it keeps and returns the known loads. */
  const refresh = useCallback(async (): Promise<EarlierLoadsRefresh> => {
    if (!lookupKey) return { ok: true, loads: [] };
    try {
      const fresh = await fetchLoads();
      if (currentKey.current === lookupKey) setLoads(fresh);
      return { ok: true, loads: fresh };
    } catch (e: unknown) {
      console.warn('Earlier loads lookup failed', e);
      return { ok: false, loads };
    }
  }, [lookupKey, fetchLoads, loads]);

  return { loads, refresh };
}
