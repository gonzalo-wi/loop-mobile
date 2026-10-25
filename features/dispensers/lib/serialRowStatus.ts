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
  /** LOAD only: the serial already went out in an earlier load of the same route and date. */
  alreadyLoaded?: boolean;
};

/**
 * What a scanned serial row shows. A non-normalized serial is rejected on
 * LOAD (not sent) but only flagged on UNLOAD (the backend routes it to Odoo).
 * Odoo availability is only checked on LOAD; an unavailable serial is an error because the
 * operator must remove it before sending (see `getOdooSubmitGate`).
 */
export function getSerialRowStatus({ type, valid, odoo, alreadyLoaded }: Input): SerialRowStatus {
  const isLoad = type === 'LOAD';

  // Checked before Odoo: once loaded the serial sits in the route, so Odoo also reports it unavailable.
  if (isLoad && alreadyLoaded) {
    return { tone: 'error', message: 'Ya salió en otra carga de este reparto · no se envía', detail: null };
  }

  if (!valid) {
    return isLoad
      ? { tone: 'error', message: 'No normalizado (jMobile) · no se envía', detail: null }
      : { tone: 'warning', message: 'No normalizado · va a Odoo (no normalizados)', detail: null };
  }

  if (isLoad && odoo && !odoo.disponible) {
    return {
      tone: 'error',
      message: 'No disponible en Odoo · eliminalo para enviar',
      detail: odoo.motivo || null,
    };
  }

  return { tone: 'ok', message: null, detail: null };
}
