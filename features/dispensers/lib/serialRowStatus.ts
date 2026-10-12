import type { DispenserMovementType, OdooValidationResult } from '../types';

export type SerialRowTone = 'ok' | 'warning' | 'error';

export type SerialRowStatus = {
  tone: SerialRowTone;
  /** Status line under the serial; null when everything is fine. */
  message: string | null;
  /** Full reason from Odoo on its own line, never truncated. */
  detail: string | null;
};

type Input = {
  type: DispenserMovementType;
  /** False when jMobile lists the serial as not normalized. */
  valid: boolean;
  odoo?: OdooValidationResult;
};

/**
 * What a scanned serial row shows. A non-normalized serial is rejected on
 * LOAD (not sent) but only flagged on UNLOAD (the backend routes it to Odoo).
 * Odoo availability is only checked on LOAD and never blocks the submit.
 */
export function getSerialRowStatus({ type, valid, odoo }: Input): SerialRowStatus {
  const isLoad = type === 'LOAD';

  if (!valid) {
    return isLoad
      ? { tone: 'error', message: 'No normalizado (jMobile) · no se envía', detail: null }
      : { tone: 'warning', message: 'No normalizado · va a Odoo (no normalizados)', detail: null };
  }

  if (isLoad && odoo && !odoo.disponible) {
    return { tone: 'warning', message: 'Odoo: no disponible', detail: odoo.motivo || null };
  }

  return { tone: 'ok', message: null, detail: null };
}
