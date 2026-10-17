/**
 * Formats a unit count the way controls are loaded: "bultos + sueltas" (15 units, pack of 6 → "2 + 3").
 * Products without bundles, or whose pack size is unknown, show the plain unit count.
 */
export function formatBundleSplit(units: number, packQuantity: number | undefined): string {
  if (!packQuantity || packQuantity <= 1) return String(units);
  return `${Math.floor(units / packQuantity)} + ${units % packQuantity}`;
}
