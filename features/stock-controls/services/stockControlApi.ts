import { api } from '@/lib/api';
import type {
  StockControl,
  CreateControlPayload,
  CreateControlItemPayload,
  PaginatedResponse,
  PendingArrivals,
} from '../types';

type SingleResponse = {
  data: StockControl;
  message: string;
};

export async function createStockControl(
  payload: CreateControlPayload
): Promise<StockControl> {
  const response = await api.post<SingleResponse>('/stock-controls', payload);
  return response.data.data;
}

export async function getStockControls(params?: {
  type?: string;
  status?: string;
  routeId?: string;
  controllerId?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}): Promise<{ controls: StockControl[]; totalElements: number; totalPages: number }> {
  const response = await api.get<PaginatedResponse<StockControl>>('/stock-controls', {
    params,
  });
  const { content, totalElements, totalPages } = response.data.data;
  return { controls: content, totalElements, totalPages };
}

export async function getStockControl(id: string): Promise<StockControl> {
  const response = await api.get<SingleResponse>(`/stock-controls/${id}`);
  return response.data.data;
}

export async function updateStockControl(
  id: string,
  payload: { observations?: string; items: CreateControlItemPayload[] }
): Promise<StockControl> {
  const response = await api.patch<SingleResponse>(`/stock-controls/${id}`, payload);
  return response.data.data;
}

export async function approveStockControl(id: string): Promise<void> {
  await api.post(`/stock-controls/${id}/approve`);
}

export async function getPendingArrivals(date?: string): Promise<PendingArrivals> {
  const response = await api.get<{ data: PendingArrivals; message: string }>(
    '/stock-controls/pending-arrivals',
    { params: date ? { date } : undefined },
  );
  return response.data.data;
}
