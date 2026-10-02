/**
 * Dispensers no normalizados según jMobile.
 *
 * jMobile expone el listado del día de dispensers "no registrados" (no normalizados: no están
 * asociados a ningún cliente). Si un serial aparece ahí:
 *  - LOAD: no se envía.
 *  - UNLOAD: se envía igual; el backend lo deriva a la ubicación de no normalizados en Odoo.
 *
 * OJO: pega directo al host de jMobile (no pasa por nuestro backend). Si en algún
 * momento se puede proxear desde el backend, conviene moverlo ahí.
 */

const AGUAS_BASE_URL = 'http://35.199.104.218:8080';
const TIMEOUT_MS = 8000;

type UnregisteredResponse = {
  success: boolean;
  listado?: { nroSerie: string }[];
};

/** Normaliza un serial para comparar: sin espacios y en mayúsculas. */
export function normalizeSerial(serial: string): string {
  return serial.replace(/\s+/g, '').toUpperCase();
}

/**
 * Deja solo el charset válido del serial ([A-Za-z0-9.*-]); saca espacios y cualquier otro
 * carácter (p. ej. < >, _, /). `.` y `*` son los únicos especiales válidos en los seriales
 * de dispensers y se conservan.
 *
 * Por default mantiene el case (lo usa el escaneo de cámara, donde el barcode ya viene en
 * mayúscula). Si `options.uppercase` es true, además pasa el resultado a mayúsculas: lo usa
 * la carga manual, porque las letras de los seriales son siempre mayúsculas y si se cargan en
 * minúscula no machean contra Aguas (jMobile) ni Odoo.
 */
export function sanitizeSerial(serial: string, options?: { uppercase?: boolean }): string {
  const clean = serial.replace(/[^A-Za-z0-9.*-]/g, '');
  return options?.uppercase ? clean.toUpperCase() : clean;
}

/**
 * Seriales no normalizados en jMobile para esa fecha (`YYYY-MM-DD`).
 * Devuelve un Set normalizado, listo para comparar contra lo escaneado.
 */
export async function getUnregisteredSerials(date: string): Promise<Set<string>> {
  const url = `${AGUAS_BASE_URL}/jmobile/service/dispenserope/getDispenserNoRegistrado=fecha=${date}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Aguas respondió ${res.status}`);
    }
    const json = (await res.json()) as UnregisteredResponse;
    const list = json.listado ?? [];
    return new Set(list.map((item) => normalizeSerial(item.nroSerie ?? '')).filter(Boolean));
  } finally {
    clearTimeout(timer);
  }
}
