import type { DispenserMovement, DispenserMovementType } from '../types';

/** Aviso a mostrar tras crear/corregir un movimiento con seriales excluidos. */
export type ExclusionNotice = {
  title: string;
  message: string;
  /** El caso "no se envió nada" merece un diálogo explícito, no un toast que se pierda. */
  requiresConfirmation: boolean;
};

/** Seriales excluidos del envío a Aguas (tolera respuestas viejas sin el campo). */
export function getExcludedSerials(mov: Pick<DispenserMovement, 'excludedSerials'>): string[] {
  return mov.excludedSerials ?? [];
}

/**
 * Qué seriales escaneados viajan en el POST/PUT.
 * - UNLOAD: todos. Los no normalizados los separa el backend y los deriva a su ubicación en Odoo;
 *   si la app los filtrara, esa derivación nunca ocurriría.
 * - LOAD: solo los registrados en Aguas (un equipo no normalizado no sale al reparto).
 */
export function shouldSendSerial(type: DispenserMovementType, registeredInAguas: boolean): boolean {
  return type === 'UNLOAD' || registeredInAguas;
}

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

/**
 * Aviso según el resultado real que devolvió el backend (`status` + `excludedSerials`).
 * `null` = nada excluido, no hay que avisar.
 */
export function getExclusionNotice(mov: DispenserMovement): ExclusionNotice | null {
  const excluded = getExcludedSerials(mov);
  if (excluded.length === 0) return null;

  const count = excluded.length;
  const list = excluded.join(', ');
  const allExcluded = mov.status === 'SKIPPED_UNREGISTERED';

  if (mov.type === 'UNLOAD') {
    return allExcluded
      ? {
          title: 'Dispensers no normalizados',
          message:
            `Ninguno entró a reparación: ${plural(count, 'el dispenser figura', `los ${count} dispensers figuran`)} ` +
            `como no normalizado${plural(count, '', 's')} y se ${plural(count, 'derivó', 'derivaron')} a la ubicación ` +
            `de no normalizados en Odoo.\n\n${list}`,
          requiresConfirmation: true,
        }
      : {
          title: 'Descarga registrada',
          message:
            `${count} dispenser${plural(count, '', 's')} no ${plural(count, 'está normalizado', 'están normalizados')} ` +
            `y se ${plural(count, 'derivó', 'derivaron')} a la ubicación de no normalizados en Odoo: ${list}`,
          requiresConfirmation: false,
        };
  }

  return allExcluded
    ? {
        title: 'No se envió la carga',
        message:
          `Ningún dispenser está disponible en expedición según Odoo, así que no se envió nada.\n\n${list}` +
          '\n\nRevisá los seriales o avisá a sistemas.',
        requiresConfirmation: true,
      }
    : {
        title: 'Carga registrada',
        message:
          `${count} dispenser${plural(count, '', 's')} no ${plural(count, 'está disponible', 'están disponibles')} ` +
          `en Odoo y no se ${plural(count, 'envió', 'enviaron')}: ${list}`,
        requiresConfirmation: false,
      };
}

/**
 * El envío a Odoo de salida (LOAD) solo ocurre si Aguas recibió algo. En SKIPPED_UNREGISTERED
 * `odooStatus` queda `null` para siempre, así que no tiene sentido esperarlo ni mostrarlo pendiente.
 */
export function expectsOdooDispatch(mov: Pick<DispenserMovement, 'type' | 'status'>): boolean {
  return mov.type === 'LOAD' && mov.status !== 'SKIPPED_UNREGISTERED' && mov.status !== 'CANCELLED';
}

/** Hay derivación de no normalizados a seguir (UNLOAD con excluidos, no cancelado). */
export function expectsNoNormalizadoIntake(mov: DispenserMovement): boolean {
  return mov.type === 'UNLOAD' && mov.status !== 'CANCELLED' && getExcludedSerials(mov).length > 0;
}
