import type { OrderStatus } from '../types';

export const ORDER_STEPS: OrderStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

export type OrderStepState = 'done' | 'current' | 'upcoming';

export type OrderStep = {
  status: OrderStatus;
  state: OrderStepState;
  /** The connector to the next step is drawn solid once that step was reached. */
  lineAfterFilled: boolean;
};

/** Each stage of an order relative to its current status; a completed order has every stage done. */
export function getOrderSteps(status: OrderStatus): OrderStep[] {
  const isCompleted = status === 'COMPLETED';
  const currentIndex = Math.max(0, ORDER_STEPS.indexOf(status));
  return ORDER_STEPS.map((step, i) => ({
    status: step,
    state: isCompleted || i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'upcoming',
    lineAfterFilled: i < ORDER_STEPS.length - 1 && (isCompleted || i < currentIndex),
  }));
}
