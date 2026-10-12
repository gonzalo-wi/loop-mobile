import type { DispenserMovement, DispenserMovementStatus } from '../types';
import { expectsOdooDispatch } from './movementOutcome';

export type StatusCellTone = 'ok' | 'pending' | 'error' | 'neutral';

export type MovementStatusCell = {
  system: 'Aguas' | 'Odoo';
  status: string;
  tone: StatusCellTone;
};

const AGUAS: Record<DispenserMovementStatus, Omit<MovementStatusCell, 'system'>> = {
  REGISTERED: { status: 'Enviando…', tone: 'pending' },
  SENT_TO_AGUAS: { status: 'Enviado', tone: 'ok' },
  AGUAS_ERROR: { status: 'Error', tone: 'error' },
  // Final: nothing was sent to Aguas, flagged like an excluded movement.
  SKIPPED_UNREGISTERED: { status: 'No enviado', tone: 'pending' },
  CANCELLED: { status: 'Cancelado', tone: 'neutral' },
};

/**
 * One status per external system, each read on its own (Aguas, and Odoo only
 * when the movement is dispatched there). Odoo with no answer yet is still sending.
 */
export function getMovementStatusCells(
  mov: Pick<DispenserMovement, 'type' | 'status' | 'odooStatus'>,
): MovementStatusCell[] {
  const cells: MovementStatusCell[] = [{ system: 'Aguas', ...(AGUAS[mov.status] ?? AGUAS.REGISTERED) }];

  if (expectsOdooDispatch(mov)) {
    cells.push(
      mov.odooStatus === 'SENT'
        ? { system: 'Odoo', status: 'OK', tone: 'ok' }
        : mov.odooStatus === 'ERROR'
          ? { system: 'Odoo', status: 'Rechazado', tone: 'error' }
          : { system: 'Odoo', status: 'Enviando…', tone: 'pending' },
    );
  }

  return cells;
}
