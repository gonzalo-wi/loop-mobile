import type { DriverSettlement } from '../types';

/**
 * Novedades que merecen el aviso dentro de la app (spec 007, FR-15): que aparezca un depósito o la
 * diferencia final de un reparto. Cada novedad se identifica con un texto estable; lo que ya vio el
 * repartidor se guarda como la lista de esos textos.
 */
export function settlementNews(settlement: DriverSettlement): string[] {
  const news: string[] = [];
  for (const route of settlement.routes) {
    const f = route.figures;
    if (route.state !== 'AVAILABLE' || !f) continue;
    if (f.depositedCash > 0) news.push(`${settlement.date}|${route.routeId}|deposit|${f.lastDepositAt ?? ''}`);
    if (f.difference !== null) news.push(`${settlement.date}|${route.routeId}|difference|${f.difference}`);
  }
  return news;
}

/** True when there is a novelty the driver has not seen yet. */
export function hasUnseenNews(news: string[], seen: readonly string[]): boolean {
  return news.some((item) => !seen.includes(item));
}
