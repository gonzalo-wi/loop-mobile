import type { FleetLocation } from '../types';

/** From here on the GPS position is considered out of date. */
export const STALE_MINUTES = 15;

function minutesSince(iso: string, now: Date): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Infinity;
  return Math.floor((now.getTime() - t) / 60000);
}

export function isLocationStale(gpsDateTime: string, now: Date): boolean {
  return minutesSince(gpsDateTime, now) >= STALE_MINUTES;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "Hoy, 07:37" if it's from today; otherwise "20/07, 07:37". */
export function formatSignal(iso: string, now: Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) return `Hoy, ${time}`;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}, ${time}`;
}

/** How long ago the app last refreshed the location. */
export function relativeShort(date: Date | null, now: Date): string {
  if (!date) return '';
  const s = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (s < 45) return 'hace unos segundos';
  if (s < 90) return 'hace 1 min';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  return `hace ${Math.floor(s / 3600)} h`;
}

export type VehicleStatusTone = 'neutral' | 'ok' | 'warn';

export function vehicleStatus(
  loc: Pick<FleetLocation, 'engineOn' | 'speed'>,
): { text: string; tone: VehicleStatusTone } {
  if (!loc.engineOn) return { text: 'Motor apagado', tone: 'neutral' };
  if (loc.speed > 0) return { text: `En movimiento · ${loc.speed} km/h`, tone: 'ok' };
  return { text: 'Detenido · motor encendido', tone: 'warn' };
}

/** User-facing text for a failed location fetch, by HTTP status. */
export function fleetErrorMessage(status: number | undefined, message?: string): string {
  if (status === 404) {
    return 'No se encontró el camión en el sistema de flota. La patente puede estar mal cargada o el GPS del vehículo está inactivo.';
  }
  if (status === 502) {
    return 'No se pudo conectar con el sistema de flota. Probá de nuevo en unos segundos.';
  }
  return message || 'No se pudo obtener la ubicación.';
}

/** Google Maps on the truck's coordinates, opened in the maps app or the browser. */
export function truckMapUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Links to try in order. On Android a google.com link can be claimed by an app
 * that doesn't understand it ("El vínculo no es compatible"); `geo:` goes to
 * whatever maps app is installed, with a labelled pin. The web link stays as
 * the fallback when no app handles `geo:`.
 */
export function truckMapUrls(lat: number, lng: number, platform: string, label: string): string[] {
  const web = truckMapUrl(lat, lng);
  if (platform !== 'android') return [web];
  return [`geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(label)})`, web];
}
