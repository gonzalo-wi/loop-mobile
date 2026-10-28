import { useCallback, useEffect, useRef } from 'react';
import { elapsedSeconds as computeElapsedSeconds, nextStartedAt } from '../lib/loadTimer';

/**
 * Measures how long a load/unload takes, from the first serial added until it is
 * submitted. The start lives in a ref on purpose: nothing about it is shown, so
 * it must not cause re-renders.
 */
export function useLoadTimer(serialCount: number, now: () => number = Date.now) {
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    startedAtRef.current = nextStartedAt(startedAtRef.current, serialCount, now());
  }, [serialCount, now]);

  const elapsedSeconds = useCallback(() => computeElapsedSeconds(startedAtRef.current, now()), [now]);

  return { elapsedSeconds };
}
