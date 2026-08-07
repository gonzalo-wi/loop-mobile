/**
 * Validación de seriales contra Aguas.
 *
 * Aguas expone un listado de dispensers "no registrados" del día: si un serial
 * aparece ahí, no existe como equipo válido y no se puede cargar en un movimiento.
 *
 * OJO: pega directo al host de Aguas (no pasa por nuestro backend). Si en algún
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
 * Seriales "no registrados" en Aguas para esa fecha (`YYYY-MM-DD`).
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
