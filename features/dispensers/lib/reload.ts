import type { DispenserMovement } from '../types';
import { getExcludedSerials } from './movementOutcome';

type RouteDay = { routeCode: string; movementDate: string };

/**
 * A route can get several loads (LOAD) for the same date: the first one plus recargas.
 * These helpers tell what a new load adds on top of the earlier ones.
 */
export function activeLoadsOf(movements: DispenserMovement[], key: RouteDay): DispenserMovement[] {
  const routeCode = key.routeCode.trim();
  return movements.filter(
    (m) =>
      m.type === 'LOAD' &&
      m.status !== 'CANCELLED' &&
      m.routeCode.trim() === routeCode &&
      m.movementDate === key.movementDate,
  );
}

function normalize(serial: string): string {
  return serial.trim().toUpperCase();
}

/**
 * Serials that already went out on those loads. The ones excluded from a load (not available in
 * Odoo at the time) never left, so a recarga may carry them.
 */
export function alreadyLoadedSerials(loads: DispenserMovement[]): Set<string> {
  const loaded = new Set<string>();
  for (const load of loads) {
    const excluded = new Set(getExcludedSerials(load).map(normalize));
    for (const serial of load.serials) {
      const code = normalize(serial);
      if (!excluded.has(code)) loaded.add(code);
    }
  }
  return loaded;
}

export function isAlreadyLoaded(loaded: Set<string>, serial: string): boolean {
  return loaded.has(normalize(serial));
}

export const LATER_RELOAD_MESSAGE =
  'Tiene una recarga posterior: solo se puede cancelar o corregir la última carga del día.';

/** Only the day's last load can be cancelled or corrected; the backend rejects the rest with 409. */
export function hasLaterLoad(mov: DispenserMovement, movements: DispenserMovement[]): boolean {
  if (mov.type !== 'LOAD') return false;
  const createdAt = Date.parse(mov.createdAt);
  return activeLoadsOf(movements, mov).some((other) => other.id !== mov.id && Date.parse(other.createdAt) > createdAt);
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count !== 1 ? 's' : ''}`;
}

export function getReloadConfirmCopy(
  routeCode: string,
  earlierLoads: DispenserMovement[],
  newCount: number,
): { title: string; message: string } {
  // Only what actually went out: serials excluded from a load never left.
  const earlierSerials = earlierLoads.reduce(
    (total, load) => total + load.serials.length - getExcludedSerials(load).length,
    0,
  );
  return {
    title: 'Esta carga va como recarga',
    message:
      `El reparto ${routeCode.trim()} ya tiene ${plural(earlierLoads.length, 'carga')} para esta fecha ` +
      `(${plural(earlierSerials, 'dispenser')}). Esta se registra como recarga y suma ${plural(newCount, 'dispenser')}.`,
  };
}
