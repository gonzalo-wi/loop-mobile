import { api } from '@/lib/api';
import type { Route, PaginatedResponse } from '../types';

export async function getAllRoutes(): Promise<Route[]> {
  const response = await api.get<PaginatedResponse<Route>>('/routes', {
    params: { size: 500, sort: 'code,asc' },
  });
  return response.data.data.content;
}
