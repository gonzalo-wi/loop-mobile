import { useCallback, useEffect, useRef, useState } from 'react';
import { getDispenserMovement } from '../services/dispenserApi';
import type { DispenserMovement } from '../types';

// El resultado de Odoo es asíncrono: no viene resuelto en el POST de creación.
// Reconsultamos el movimiento cada 2s, hasta 5 intentos (~10s de ventana).
const DEFAULT_INTERVAL_MS = 2000;
const DEFAULT_MAX_ATTEMPTS = 5;

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

/**
 * Reconsulta un movimiento hasta que `odooStatus` deje de ser `null` o se
 * agote la cantidad de intentos. Devuelve el último movimiento obtenido
 * (con `odooStatus` resuelto, o todavía `null` si se agotó la ventana).
 *
 * Cancelable vía `AbortSignal`: si se aborta, corta el loop y rechaza con
 * `AbortError` (el caller puede ignorarlo).
 */
export async function pollOdooStatus(
  id: string,
  options?: { intervalMs?: number; maxAttempts?: number; signal?: AbortSignal },
): Promise<DispenserMovement> {
  const intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS;
  const maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const signal = options?.signal;

  let movement = await getDispenserMovement(id);

  for (let attempt = 1; attempt < maxAttempts && movement.odooStatus === null; attempt++) {
    if (signal?.aborted) return movement;
    await wait(intervalMs, signal ?? new AbortController().signal);
    if (signal?.aborted) return movement;
    movement = await getDispenserMovement(id);
  }

  return movement;
}

type UseOdooPollingResult = {
  movement: DispenserMovement | null;
  polling: boolean;
  /** Dispara (o reinicia) el polling para el `id` dado. */
  start: (id: string) => void;
};

/**
 * Hook para consumir `pollOdooStatus` desde una pantalla, con cleanup
 * automático (cancela si el componente se desmonta o se llama `start` de
 * nuevo antes de que termine el intento anterior).
 */
export function useOdooPolling(): UseOdooPollingResult {
  const [movement, setMovement] = useState<DispenserMovement | null>(null);
  const [polling, setPolling] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const start = useCallback((id: string) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setPolling(true);
    pollOdooStatus(id, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setMovement(result);
      })
      .catch(() => {
        // AbortError esperado al cancelar; no hay nada que mostrar.
      })
      .finally(() => {
        if (!controller.signal.aborted) setPolling(false);
      });
  }, []);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  return { movement, polling, start };
}
