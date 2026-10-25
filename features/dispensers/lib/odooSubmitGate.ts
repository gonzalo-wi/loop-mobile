import type { DispenserMovementType, OdooValidationResult } from '../types';

export type OdooValidationStatus = 'validating' | 'done' | 'failed';

/** Outcome of the last settled Odoo request and the serials it was asked about. */
export type SettledValidation = { codes: readonly string[]; failed: boolean };

export type OdooSubmitGate =
  | { kind: 'ok' }
  | { kind: 'validating' }
  | { kind: 'blocked'; unavailable: string[] };

type GateInput = {
  type: DispenserMovementType;
  /** Serials that would actually be sent (already-loaded and non-normalized ones excluded). */
  codes: readonly string[];
  validation: ReadonlyMap<string, OdooValidationResult>;
  status: OdooValidationStatus;
};

/**
 * Whether the LOAD may be sent given Odoo's availability answer. A known unavailable serial
 * blocks even while re-validating; a failed validation never blocks (the backend checks again).
 */
export function getOdooSubmitGate({ type, codes, validation, status }: GateInput): OdooSubmitGate {
  if (type !== 'LOAD') return { kind: 'ok' };

  const unavailable = codes.filter((code) => validation.get(code)?.disponible === false);
  if (unavailable.length > 0) return { kind: 'blocked', unavailable };
  if (status === 'validating') return { kind: 'validating' };
  return { kind: 'ok' };
}

/**
 * Validation status for the CURRENT list: a settled answer only counts if it covers every
 * current serial, so a stale response can never unblock a list that grew afterwards.
 */
export function resolveValidationStatus(
  settled: SettledValidation | null,
  codes: readonly string[],
): OdooValidationStatus {
  if (codes.length === 0) return 'done';
  if (!settled) return 'validating';
  const covered = new Set(settled.codes);
  if (!codes.every((code) => covered.has(code))) return 'validating';
  return settled.failed ? 'failed' : 'done';
}

export function getOdooUnavailableMessage(count: number): string {
  return count === 1
    ? 'Tenés 1 dispenser que no está disponible en Odoo. Eliminalo de la lista para poder enviar.'
    : `Tenés ${count} dispensers que no están disponibles en Odoo. Eliminalos de la lista para poder enviar.`;
}
