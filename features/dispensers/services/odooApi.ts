/**
 * Integración con Odoo para el flujo de carga (LOAD) de dispensers.
 * Es adicional/opcional respecto del registro del movimiento: si estos
 * endpoints fallan, no debe bloquear el trabajo del operario.
 */

import { api } from '@/lib/api';
import type { OdooAvailableEquipment, OdooEquipment, OdooValidationResult } from '../types';

const AVAILABLE_EQUIPMENT_URL = '/dispenser-movements/odoo/available-equipment';
const VALIDATE_EQUIPMENT_URL = '/dispenser-movements/odoo/validate-equipment';

// Tamaño de página razonable para no pedir de a poco ni traer todo en un solo golpe.
const PAGE_SIZE = 100;

type AvailableEquipmentResponse = {
  data: OdooAvailableEquipment;
  message: string | null;
};

type ValidateEquipmentResponse = {
  data: unknown;
  message: string | null;
};

/**
 * Todos los equipos disponibles en Odoo para cargar. Pagina internamente
 * (limite/offset) hasta juntar el `total` que informa el backend.
 */
export async function getOdooAvailableEquipment(): Promise<OdooEquipment[]> {
  const equipos: OdooEquipment[] = [];
  let offset = 0;
  let total = Infinity;

  while (equipos.length < total) {
    const res = await api.get<AvailableEquipmentResponse>(AVAILABLE_EQUIPMENT_URL, {
      params: { limite: PAGE_SIZE, offset },
    });
    const page = res.data.data;
    total = page.total;
    equipos.push(...page.equipos);

    // Si el backend no devuelve nada en esta página, cortamos para no loopear infinito.
    if (page.devueltos <= 0 || page.equipos.length === 0) break;
    offset += page.equipos.length;
  }

  return equipos;
}

/**
 * Normaliza la respuesta de validación de Odoo a `OdooValidationResult[]`.
 *
 * Contrato real (confirmado contra stage): `data` es un objeto
 * `{ success, equipos: [...] }` (NO una lista pelada). Cada item cambia de
 * forma según disponibilidad:
 *   - disponible=true  → { serie, serie_odoo, disponible, ubicacion }  (sin motivo)
 *   - disponible=false → { serie, disponible, motivo }                 (sin serie_odoo/ubicacion)
 *
 * Se mantiene defensivo: si falta `equipos` o un item no tiene forma
 * reconocible, se descarta sin romper la UI.
 */
function parseValidationResult(data: unknown): OdooValidationResult[] {
  if (!data || typeof data !== 'object') return [];

  const equipos = (data as Record<string, unknown>).equipos;
  if (!Array.isArray(equipos)) return [];

  return equipos
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      serie: typeof item.serie === 'string' ? item.serie : '',
      disponible: item.disponible === true,
      motivo: typeof item.motivo === 'string' ? item.motivo : null,
      serie_odoo: typeof item.serie_odoo === 'string' ? item.serie_odoo : null,
      ubicacion: typeof item.ubicacion === 'string' ? item.ubicacion : null,
    }))
    .filter((item) => item.serie.length > 0);
}

/**
 * Valida un lote de series contra Odoo antes de confirmar la carga.
 * Guard: si `equipos` está vacío, no pega al backend.
 */
export async function validateOdooEquipment(equipos: string[]): Promise<OdooValidationResult[]> {
  if (equipos.length === 0) return [];

  const res = await api.post<ValidateEquipmentResponse>(VALIDATE_EQUIPMENT_URL, { equipos });
  return parseValidationResult(res.data.data);
}
