import type { Route } from '../types';

/**
 * The backend `search` also matches plate, branch and driver, so typing a route number
 * brought up other trucks first. Operators search by route number only.
 */
export function filterRoutesByCode(routes: Route[], term: string): Route[] {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return routes;
  return routes.filter((r) => r.code.toLowerCase().includes(normalized));
}
