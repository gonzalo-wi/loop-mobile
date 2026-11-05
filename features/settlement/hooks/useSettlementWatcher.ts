import { useEffect } from 'react';
import { AppState } from 'react-native';
import { getSettlementSeen } from '@/lib/storage';
import { useSettlementStore } from '@/store/settlementStore';
import { getMySettlement } from '../services/settlementApi';
import { checkSettlementNews, startSettlementWatcher } from '../lib/watcher';

/**
 * Aviso dentro de la app (spec 007, FR-15): va montado en la barra de pestañas, así corre en cualquier
 * pantalla. Solo para repartidores; sin push (eso es la etapa 2).
 */
export function useSettlementWatcher(enabled: boolean) {
  const setUnseen = useSettlementStore((s) => s.setUnseen);

  useEffect(() => {
    if (!enabled) {
      setUnseen(false);
      return;
    }
    return startSettlementWatcher({
      appState: AppState,
      check: () => checkSettlementNews({ fetchSettlement: getMySettlement, getSeen: getSettlementSeen, setUnseen }),
    });
  }, [enabled, setUnseen]);
}
