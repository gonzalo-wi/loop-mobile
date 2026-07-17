import { api } from '@/lib/api';
import type { FleetLocation } from '../types';

type FleetLocationResponse = {
  data: FleetLocation;
  message?: string;
};

/**
 * Ubicación en vivo del camión por patente. La búsqueda es case-insensitive.
 * Errores esperados (llegan como ApiError con status): 404 (patente no encontrada),
 * 502 (Powerfleet no respondió).
 */
export async function getFleetLocation(licensePlate: string): Promise<FleetLocation> {
  const response = await api.get<FleetLocationResponse>(
    `/fleet/location/${encodeURIComponent(licensePlate)}`,
  );
  return response.data.data;
}
