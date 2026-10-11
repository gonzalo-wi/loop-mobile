/**
 * Warehouse operators (controller, picker, loader) are often the same person switching
 * tasks day to day, so all of them can load/unload dispensers.
 */
const DISPENSER_ROLES: readonly string[] = ['ADMIN', 'CONTROLADOR', 'PICKER', 'CARGADOR_DISPENSERS'];

export function canAccessDispensers(role: string | undefined): boolean {
  return role !== undefined && DISPENSER_ROLES.includes(role);
}
