import type { DispenserMovement, DispenserMovementType } from '../types';

type MovementKey = { type: DispenserMovementType; routeCode: string; movementDate: string };

/**
 * The movement that blocks registering a new one: same type, route and date,
 * not cancelled. Used to offer "Ver ese movimiento" when a submit is rejected.
 */
export function findActiveMovement(
  movements: DispenserMovement[],
  key: MovementKey,
): DispenserMovement | null {
  const routeCode = key.routeCode.trim();
  return (
    movements.find(
      (m) =>
        m.status !== 'CANCELLED' &&
        m.type === key.type &&
        m.routeCode.trim() === routeCode &&
        m.movementDate === key.movementDate,
    ) ?? null
  );
}

/** Message set by lib/api when the request never got an answer. */
const NO_CONNECTION_MESSAGE = 'Sin conexión al servidor';

/**
 * Copy for a failed submit. The scanned dispensers stay on screen, so the
 * text says so; without a server answer it points at the connection.
 */
export function getSubmitFailureCopy(
  error: { message?: string; status?: number },
  count: number,
): { title: string; message: string } {
  const kept =
    count === 1
      ? 'Tu dispenser sigue cargado en esta pantalla.'
      : `Tus ${count} dispensers siguen cargados en esta pantalla.`;

  if (error.status === undefined && (!error.message || error.message === NO_CONNECTION_MESSAGE)) {
    return { title: 'No se pudo enviar', message: `Revisá la conexión e intentá de nuevo. ${kept}` };
  }

  const reason = error.message?.trim() || 'Intentá de nuevo.';
  return { title: 'No se pudo enviar', message: `${reason}\n\n${kept}` };
}
