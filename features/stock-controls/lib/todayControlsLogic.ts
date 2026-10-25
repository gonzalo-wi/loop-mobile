import type { StockControl } from '../types';

type WithStatus = Pick<StockControl, 'status'>;

export type TodayControlCounts = {
  pending: number;
  accepted: number;
  rejected: number;
};

export function countTodayControls(controls: WithStatus[]): TodayControlCounts {
  const counts: TodayControlCounts = { pending: 0, accepted: 0, rejected: 0 };
  for (const c of controls) {
    if (c.status === 'PENDING_DRIVER_APPROVAL') counts.pending += 1;
    else if (c.status === 'ACCEPTED_BY_DRIVER') counts.accepted += 1;
    else if (c.status === 'REJECTED_BY_DRIVER') counts.rejected += 1;
  }
  return counts;
}

/** Rejected controls need the controller's action, so they go on top (stable for the rest). */
export function sortRejectedFirst<T extends WithStatus>(controls: T[]): T[] {
  const rejected = controls.filter((c) => c.status === 'REJECTED_BY_DRIVER');
  const others = controls.filter((c) => c.status !== 'REJECTED_BY_DRIVER');
  return [...rejected, ...others];
}
