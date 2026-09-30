import { api } from '@/lib/api';
import type { Route, PaginatedResponse } from '../types';

export async function getAllRoutes(search?: string): Promise<Route[]> {
  const params: Record<string, string | number> = { size: 500 };
  const trimmed = search?.trim();
  if (trimmed) params.search = trimmed;
  // El backend ya devuelve orden natural (Rto 1, Rto 2 ... Rto 10) y, si va `search`,
  // filtra sobre toda la base (no solo la página), así que no filtramos en el cliente.
  const response = await api.get<PaginatedResponse<Route>>('/routes', { params });
  return response.data.data.content;
}
