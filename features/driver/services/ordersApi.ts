import { api } from '@/lib/api';
import type { Order, OrderableProduct, CreateOrderPayload } from '../types';
import type { PaginatedResponse } from '@/features/stock-controls/types';

type OrderSingleResponse = { data: Order; message: string };

export async function getOrderableProducts(): Promise<OrderableProduct[]> {
  const response = await api.get<PaginatedResponse<OrderableProduct>>('/orderable-products', {
    params: { active: true },
  });
  return response.data.data.content;
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const response = await api.post<OrderSingleResponse>('/orders', payload);
  return response.data.data;
}

export async function getOrders(params?: {
  routeId?: string;
  status?: string;
  from?: string;
  to?: string;
  size?: number;
}): Promise<{ orders: Order[]; totalElements: number }> {
  const response = await api.get<PaginatedResponse<Order>>('/orders', { params });
  const { content, totalElements } = response.data.data;
  return { orders: content, totalElements };
}

export async function getOrder(id: string): Promise<Order> {
  const response = await api.get<OrderSingleResponse>(`/orders/${id}`);
  return response.data.data;
}

export async function startOrder(id: string): Promise<Order> {
  const response = await api.post<OrderSingleResponse>(`/orders/${id}/start`);
  return response.data.data;
}

export async function completeOrder(id: string): Promise<Order> {
  const response = await api.post<OrderSingleResponse>(`/orders/${id}/complete`);
  return response.data.data;
}
