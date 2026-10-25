import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { getStockControls } from '../services/stockControlApi';
import { countTodayControls } from '../lib/todayControlsLogic';
import type { StockControl } from '../types';

function todayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Controles del día creados por el controlador, con auto-actualización.
 * Hace polling mientras la pantalla está activa para reflejar cuándo el
 * repartidor acepta cada control (PENDING_DRIVER_APPROVAL → ACCEPTED_BY_DRIVER).
 */
export function useTodayControls(controllerId: string | undefined, pollMs = 12000) {
  const [controls, setControls] = useState<StockControl[]>([]);

  const load = useCallback(async () => {
    if (!controllerId) return;
    try {
      const today = todayStr();
      const res = await getStockControls({
        controllerId,
        from: today,
        to: today,
        size: 100,
      });
      setControls(res.controls);
    } catch {
      // Silencioso: reintenta en el próximo ciclo de polling.
    }
  }, [controllerId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, pollMs);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [load, pollMs]);

  const { pending, accepted, rejected } = countTodayControls(controls);

  return { controls, pending, accepted, rejected, reload: load };
}
