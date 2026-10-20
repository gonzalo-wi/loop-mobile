/**
 * Warehouse operators (CONTROLADOR) switch between controlling, picking and loading day to day,
 * so they load/unload dispensers too. Plant supervisors also do recargas.
 */
const DISPENSER_ROLES: readonly string[] = ['ADMIN', 'CONTROLADOR', 'SUPERVISOR'];

export function canAccessDispensers(role: string | undefined): boolean {
  return role !== undefined && DISPENSER_ROLES.includes(role);
}
