import { api } from '@/lib/api';
import type { Product, PaginatedResponse } from '../types';

export async function getProducts(): Promise<Product[]> {
  const response = await api.get<PaginatedResponse<Product>>('/products', {
    params: { size: 200, sort: 'displayOrder,asc' },
  });
  return response.data.data.content.filter((p) => p.active);
}
