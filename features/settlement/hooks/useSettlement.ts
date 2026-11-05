import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { saveSettlementSeen } from '@/lib/storage';
import { useSettlementStore } from '@/store/settlementStore';
import { ApiError } from '@/lib/api';
import { getMySettlement } from '../services/settlementApi';
import { markSettlementSeen } from '../lib/watcher';
import type { DriverSettlement } from '../types';

/** Rendición en pantalla: carga al enfocar, pull-to-refresh y marca las novedades como vistas. */
export function useSettlement() {
  const setUnseen = useSettlementStore((s) => s.setUnseen);
  const [data, setData] = useState<DriverSettlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const settlement = await getMySettlement();
        setData(settlement);
        await markSettlementSeen(settlement, { saveSeen: saveSettlementSeen, setUnseen });
      } catch (e) {
        setError(
          e instanceof ApiError && e.status === 403
            ? 'Esta pantalla es solo para repartidores.'
            : 'No pudimos actualizar tu rendición. Revisá la conexión y probá de nuevo.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [setUnseen],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { data, loading, refreshing, error, refresh: () => load(true), retry: () => load() };
}
