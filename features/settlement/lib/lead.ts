import type { SettlementFigures } from '../types';
import { DIFFERENCE_LABEL, differenceLabel, formatMoney } from './format';

export type LeadTone = 'blue' | 'green' | 'orange';

/** What the top of a route's card says (spec 007, FR-12a and FR-13). */
export type Lead = { tone: LeadTone; eyebrow: string; title: string };

/**
 * Before the deposit: how much cash to take to the ATM. After it: what is missing or left over, live, so the
 * driver can deposit again. Treasury's official review is a separate line (see officialReview).
 */
export function leadOf(f: SettlementFigures): Lead {
  if (f.cashDifference === null) {
    return f.expectedCash === null
      ? { tone: 'blue', eyebrow: 'Efectivo a depositar', title: 'Tesorería todavía no tiene el monto' }
      : { tone: 'blue', eyebrow: 'Tenés que depositar', title: formatMoney(f.expectedCash) };
  }
  if (f.cashDifference < 0) return { tone: 'orange', eyebrow: 'Te faltan', title: formatMoney(-f.cashDifference) };
  if (f.cashDifference > 0) return { tone: 'green', eyebrow: 'Te sobran', title: formatMoney(f.cashDifference) };
  return { tone: 'green', eyebrow: 'Depositaste', title: 'Justo' };
}

/** Treasury's official difference, or that it is still pending (FR-13). */
export function officialReview(f: SettlementFigures): string {
  if (f.difference === null || f.differenceType === null) return 'Pendiente de revisión de tesorería';
  if (f.differenceType === 'NONE') return DIFFERENCE_LABEL.NONE;
  return `${differenceLabel(f.differenceType)} ${formatMoney(Math.abs(f.difference))}`;
}
