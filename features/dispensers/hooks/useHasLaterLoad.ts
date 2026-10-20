import { useCallback, useEffect, useState } from 'react';
import { getDispenserMovements } from '../services/dispenserApi';
import { hasLaterLoad } from '../lib/reload';
import type { DispenserMovement } from '../types';

// A route gets a handful of loads a day; this is a ceiling, not a page.
const MAX_LOADS = 50;

/** `checking` until the answer arrives, so cancel/correct don't flash in for a load that can't change. */
export type LaterLoadState = 'checking' | 'later' | 'last';

/**
 * Whether a later load (a recarga) exists for this load's route and date. Only the day's last load
 * can be cancelled or corrected. A failed lookup answers `last`: the backend still refuses with 409.
 */
export function useHasLaterLoad(mov: DispenserMovement | null) {
  const isActiveLoad = mov !== null && mov.type === 'LOAD' && mov.status !== 'CANCELLED';
  const [state, setState] = useState<LaterLoadState>(isActiveLoad ? 'checking' : 'last');

  const lookup = useCallback(async (): Promise<boolean> => {
    if (!mov || !isActiveLoad) return false;
    const { movements } = await getDispenserMovements({
      type: 'LOAD',
      routeCode: mov.routeCode,
      from: mov.movementDate,
      to: mov.movementDate,
      size: MAX_LOADS,
    });
    return hasLaterLoad(mov, movements);
    // Only another movement changes the answer, not every status poll of the same one.
  }, [mov?.id, isActiveLoad]);

  useEffect(() => {
    if (!isActiveLoad) {
      setState('last');
      return;
    }
    let cancelled = false;
    setState('checking');
    lookup()
      .then((later) => {
        if (!cancelled) setState(later ? 'later' : 'last');
      })
      .catch((e: unknown) => {
        console.warn('Later load lookup failed', e);
        if (!cancelled) setState('last');
      });
    return () => {
      cancelled = true;
    };
  }, [lookup, isActiveLoad]);

  /** Asks again (e.g. after the backend refused with 409) and returns whether a later load exists. */
  const recheck = useCallback(async (): Promise<boolean> => {
    try {
      const later = await lookup();
      setState(later ? 'later' : 'last');
      return later;
    } catch (e: unknown) {
      console.warn('Later load lookup failed', e);
      return false;
    }
  }, [lookup]);

  return { state, recheck };
}
