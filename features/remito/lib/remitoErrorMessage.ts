/**
 * What the driver reads when today's remito can't be opened. The backend's own
 * text ("No EXIT control found for route…") is never shown: 404/409 mean there
 * is no exit control (so no remito) for today yet.
 */
export function remitoErrorMessage(status: number | undefined): string {
  if (status === 404 || status === 409) return 'No tenés un remito disponible para hoy.';
  return 'No se pudo obtener el remito. Probá de nuevo en unos minutos.';
}
