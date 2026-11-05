import type { SettlementFigures } from '../types';
import { DIFFERENCE_LABEL, differenceLabel, formatMoney } from './format';
import { formatClockTime } from '@/lib/dateFormat';

export type LeadTone = 'blue' | 'green' | 'orange';

/** What the top of a route's card says (spec 007, FR-12a and FR-13). */
export type Lead = { tone: LeadTone; eyebrow: string; title: string; hint: string | null };

/**
 * Before the deposit: how much cash to take to the ATM. After it: what is missing or left over, live, so the
 * driver can deposit again. Treasury's official review is a separate line (see officialReview).
 * `== null` on purpose: an older backend omits the field, and undefined must read as "no data", never as 0.
 */
export function leadOf(f: SettlementFigures): Lead {
  if (f.cashDifference == null) {
    if (f.depositedCash > 0) {
      return { tone: 'blue', eyebrow: 'Depositaste', title: formatMoney(f.depositedCash), hint: 'Tesorería todavía no tiene el monto esperado.' };
    }
    return f.expectedCash == null
      ? { tone: 'blue', eyebrow: 'Efectivo a depositar', title: 'Tesorería todavía no tiene el monto', hint: null }
      : {
          tone: 'blue',
          eyebrow: 'Tenés que depositar',
          title: formatMoney(f.expectedCash),
          hint: 'Si recién depositaste, actualizá en unos segundos.',
        };
  }
  if (f.cashDifference < 0) return { tone: 'orange', eyebrow: 'Te faltan', title: formatMoney(-f.cashDifference), hint: null };
  if (f.cashDifference > 0) return { tone: 'green', eyebrow: 'Te sobran', title: formatMoney(f.cashDifference), hint: null };
  return { tone: 'green', eyebrow: 'Depositaste', title: 'Justo', hint: null };
}

/** Treasury's official difference, or that it is still pending (FR-13). */
export function officialReview(f: SettlementFigures): string {
  if (f.difference == null || f.differenceType == null) return 'Pendiente de revisión de tesorería';
  if (f.differenceType === 'NONE') return DIFFERENCE_LABEL.NONE;
  return `${differenceLabel(f.differenceType)} ${formatMoney(Math.abs(f.difference))}`;
}

/** "14:05:09": PAC reads the ATM at most every 20 s, so the seconds matter. Empty when it is not a date. */
function clockWithSeconds(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${formatClockTime(iso)}:${String(d.getSeconds()).padStart(2, '0')}`;
}

/**
 * When the deposits were read from the ATM (FR-13) and whether that read failed (FR-13a). `stale` asks the
 * screen to show it as a warning. Null when there is nothing to say (an older backend without the fields).
 */
export function depositsReadNote(f: SettlementFigures): { text: string; stale: boolean } | null {
  const at = f.depositsCheckedAt ? clockWithSeconds(f.depositsCheckedAt) : '';
  if (f.depositsLive === false) {
    return {
      stale: true,
      text: at
        ? `No pudimos consultar el cajero automático ahora. Mostramos los depósitos leídos a las ${at}.`
        : 'No pudimos consultar el cajero automático ahora. Mostramos los últimos depósitos registrados.',
    };
  }
  return at ? { stale: false, text: `Cajero automático consultado a las ${at}` } : null;
}
