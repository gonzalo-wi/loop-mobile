import { api } from '@/lib/api';
import type { AppVersionInfo } from '../types';

/**
 * Última versión disponible. Endpoint público (se consulta antes del login).
 */
export async function getLatestVersion(): Promise<AppVersionInfo> {
  const response = await api.get<AppVersionInfo>('/app/version');
  return response.data;
}
