import type { PendingArrivals } from '../types';

export type ArrivalsState = 'empty' | 'inProgress' | 'allArrived';

/**
 * How the "En ruta" screen reads today's arrivals. With no routes out the
 * screen shows an empty state instead of "100% completado" over 0 of 0.
 */
export function getArrivalsProgress(
  data: Pick<PendingArrivals, 'totalExpected' | 'arrived' | 'pending'>,
): { state: ArrivalsState; percent: number } {
  if (data.totalExpected <= 0) return { state: 'empty', percent: 0 };
  const percent = Math.max(0, Math.min(100, Math.round((data.arrived / data.totalExpected) * 100)));
  return { state: data.pending > 0 ? 'inProgress' : 'allArrived', percent };
}
