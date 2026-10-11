import type { DispenserMovementType } from '../types';

/**
 * "Embolsado": dispenser nuevo que el repartidor no pudo entregar y vuelve en la descarga
 * sin usar. Se marca para que en planta no pase por reparación. Solo queda en Loop: igual
 * viaja a Aguas/Odoo como cualquier descarga.
 */
type BaggableSerial = { code: string; bagged: boolean };

/** Series marcadas como embolsadas que viajan en el POST. Solo aplica a descargas. */
export function baggedSerialsToSend(type: DispenserMovementType, entries: BaggableSerial[]): string[] {
  if (type !== 'UNLOAD') return [];
  return entries.filter((e) => e.bagged).map((e) => e.code);
}

export function toggleBagged<T extends BaggableSerial>(entries: T[], code: string): T[] {
  return entries.map((e) => (e.code === code ? { ...e, bagged: !e.bagged } : e));
}

export function toggleCode(codes: string[], code: string): string[] {
  return codes.includes(code) ? codes.filter((c) => c !== code) : [...codes, code];
}

/** Al corregir: solo descargas, y solo marcas de series que siguen en la lista (el backend rechaza las demás). */
export function baggedAmong(type: DispenserMovementType, serials: string[], bagged: string[]): string[] {
  if (type !== 'UNLOAD') return [];
  return bagged.filter((code) => serials.includes(code));
}

/** El backend compara series sin distinguir mayúsculas; acá igual, para no perder la etiqueta. */
export function isBagged(code: string, bagged: string[]): boolean {
  const target = code.toUpperCase();
  return bagged.some((c) => c.toUpperCase() === target);
}
