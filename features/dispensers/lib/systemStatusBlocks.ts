import type { DispenserMovement, DispenserMovementStatus, OdooStatus } from '../types';
import { expectsNoNormalizadoIntake, expectsOdooDispatch } from './movementOutcome';
import { getMovementStatusCells, type StatusCellTone } from './movementStatusCells';

export type SystemStatusBlock = {
  system: 'aguas' | 'odoo';
  tag: string;
  /** Short status, shown big. */
  title: string;
  /** Voucher or the full status sentence; null when the title says it all. */
  detail: string | null;
  tone: StatusCellTone;
};

const AGUAS_DETAIL: Record<DispenserMovementStatus, string | null> = {
  REGISTERED: 'Registrado · enviando a Aguas',
  // The tag plus "Enviado" already say it; repeating "Enviado a Aguas" adds nothing.
  SENT_TO_AGUAS: null,
  AGUAS_ERROR: 'Error — reintentando',
  SKIPPED_UNREGISTERED: 'No enviado a Aguas · todos excluidos',
  CANCELLED: null,
};

type OdooLabels = { pending: string; sent: string; error: string };

const LOAD_LABELS: OdooLabels = {
  pending: 'Enviando a Odoo…',
  sent: 'Registrado en Odoo',
  error: 'Odoo rechazó la carga',
};

const NO_NORMALIZADO_LABELS: OdooLabels = {
  pending: 'Derivando no normalizados a Odoo…',
  sent: 'No normalizados en Odoo',
  error: 'Odoo rechazó los no normalizados · reintentando',
};

function odooBlock(
  tag: string,
  status: OdooStatus,
  pickingName: string | null | undefined,
  labels: OdooLabels,
): SystemStatusBlock {
  if (status === 'SENT') {
    return { system: 'odoo', tag, title: 'OK', detail: pickingName ? `Comprobante: ${pickingName}` : labels.sent, tone: 'ok' };
  }
  if (status === 'ERROR') {
    return { system: 'odoo', tag, title: 'Rechazado', detail: labels.error, tone: 'error' };
  }
  return { system: 'odoo', tag, title: 'Enviando…', detail: labels.pending, tone: 'pending' };
}

/**
 * The movement's status in each external system, read independently: a load
 * can be sent to Aguas and rejected by Odoo. Odoo shows up for loads it is
 * dispatched to, and for unloads that route non-normalized serials to it.
 */
export function getSystemStatusBlocks(mov: DispenserMovement): SystemStatusBlock[] {
  const aguasCell = getMovementStatusCells(mov)[0];
  const blocks: SystemStatusBlock[] = [
    {
      system: 'aguas',
      tag: 'AGUAS',
      title: aguasCell.status,
      // Unknown statuses fall back like the list does (as still sending).
      detail: mov.status in AGUAS_DETAIL ? AGUAS_DETAIL[mov.status] : AGUAS_DETAIL.REGISTERED,
      tone: aguasCell.tone,
    },
  ];

  if (expectsOdooDispatch(mov)) {
    blocks.push(odooBlock('ODOO', mov.odooStatus, mov.odooPickingName, LOAD_LABELS));
  }
  if (expectsNoNormalizadoIntake(mov)) {
    blocks.push(
      odooBlock(
        'ODOO · NO NORMALIZADOS',
        mov.odooNoNormalizadoStatus ?? null,
        mov.odooNoNormalizadoPickingName,
        NO_NORMALIZADO_LABELS,
      ),
    );
  }

  return blocks;
}
