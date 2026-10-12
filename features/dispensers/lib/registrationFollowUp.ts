import type { DispenserMovement } from '../types';
import { expectsNoNormalizadoIntake, expectsOdooDispatch } from './movementOutcome';

/**
 * True while some external system still owes an answer for a just-created
 * movement: Aguas while REGISTERED, Odoo for a dispatched load, and the
 * non-normalized intake for an unload with excluded serials.
 */
export function isAwaitingSystems(mov: DispenserMovement): boolean {
  if (mov.status === 'REGISTERED') return true;
  if (expectsOdooDispatch(mov) && mov.odooStatus === null) return true;
  if (expectsNoNormalizadoIntake(mov) && (mov.odooNoNormalizadoStatus ?? null) === null) return true;
  return false;
}
