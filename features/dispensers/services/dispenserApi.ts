import { api } from '@/lib/api';
import type { PaginatedResponse } from '@/features/stock-controls/types';
import type {
  AguasCatalog,
  DispenserMovement,
  CreateMovementPayload,
} from '../types';

// Los catálogos vienen anidados: { data: { success, data: { salida_camion, vuelta_camion } } }
type CatalogResponse = {
  data: { success: boolean; data: AguasCatalog };
};

type MovementSingleResponse = {
  data: DispenserMovement;
  message: string;
};

export async function getAguasLocations(): Promise<AguasCatalog> {
  const res = await api.get<CatalogResponse>('/dispenser-movements/aguas/locations');
  return res.data.data.data;
}

export async function getAguasStates(): Promise<AguasCatalog> {
  const res = await api.get<CatalogResponse>('/dispenser-movements/aguas/states');
  return res.data.data.data;
}

export async function createDispenserMovement(
  payload: CreateMovementPayload,
): Promise<DispenserMovement> {
  const res = await api.post<MovementSingleResponse>('/dispenser-movements', payload);
  return res.data.data;
}

export async function getDispenserMovements(params?: {
  type?: string;
  routeCode?: string;
  status?: string;
  from?: string;
  to?: string;
  size?: number;
}): Promise<{ movements: DispenserMovement[]; totalElements: number }> {
  const res = await api.get<PaginatedResponse<DispenserMovement>>('/dispenser-movements', {
    params,
  });
  const { content, totalElements } = res.data.data;
  return { movements: content, totalElements };
}

export async function getDispenserMovement(id: string): Promise<DispenserMovement> {
  const res = await api.get<MovementSingleResponse>(`/dispenser-movements/${id}`);
  return res.data.data;
}

/**
 * "Corregir": Aguas no permite editar, así que el backend elimina el anterior
 * y crea uno nuevo con los datos corregidos. Devuelve el movimiento nuevo (nuevo id).
 */
export async function updateDispenserMovement(
  id: string,
  payload: CreateMovementPayload,
): Promise<DispenserMovement> {
  const res = await api.put<MovementSingleResponse>(`/dispenser-movements/${id}`, payload);
  return res.data.data;
}

/** Cancela (elimina en Aguas si ya se envió) y marca el local como CANCELLED. */
export async function cancelDispenserMovement(id: string): Promise<DispenserMovement> {
  const res = await api.delete<MovementSingleResponse>(`/dispenser-movements/${id}`);
  return res.data.data;
}
