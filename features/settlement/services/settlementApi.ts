import { api } from '@/lib/api';
import type { DriverSettlement } from '../types';

type DriverSettlementResponse = {
  data: DriverSettlement;
  message?: string;
};

/**
 * Rendición de hoy de los repartos del repartidor logueado. Si tesorería no responde, el backend
 * igual contesta 200 con el reparto en estado UNAVAILABLE; los errores HTTP son de sesión o red.
 */
export async function getMySettlement(): Promise<DriverSettlement> {
  const response = await api.get<DriverSettlementResponse>('/settlements/me');
  return response.data.data;
}
