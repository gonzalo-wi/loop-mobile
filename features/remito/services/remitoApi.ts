import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { getToken } from '@/lib/storage';
import { ApiError } from '@/lib/api';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';
// FLAG_GRANT_READ_URI_PERMISSION: el visor necesita poder leer el content:// URI.
const FLAG_GRANT_READ_URI_PERMISSION = 1;

/**
 * Descarga el remito de salida (PDF) del reparto para una fecha, con el token de auth.
 * Devuelve el uri local del archivo. En 404/409 lanza ApiError con el message del backend.
 */
export async function downloadRemito(routeId: string, date: string): Promise<string> {
  const token = await getToken();
  const url = `${BASE_URL}/stock-controls/remito?routeId=${encodeURIComponent(routeId)}&date=${date}`;
  const fileUri = `${FileSystem.cacheDirectory}remito-${routeId}-${date}.pdf`;

  await FileSystem.deleteAsync(fileUri, { idempotent: true });

  const res = await FileSystem.downloadAsync(url, fileUri, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (res.status !== 200) {
    // En error el body es el JSON del backend ({ status, error, message }).
    let message = 'Todavía no está disponible el remito de hoy.';
    try {
      const parsed = JSON.parse(await FileSystem.readAsStringAsync(res.uri));
      if (parsed?.message) message = parsed.message;
    } catch {
      // body no-JSON: dejamos el mensaje por defecto
    }
    await FileSystem.deleteAsync(res.uri, { idempotent: true });
    throw new ApiError(message, res.status);
  }

  return res.uri;
}

/** Abre el PDF descargado con el visor nativo del teléfono (Android). */
export async function openRemitoPdf(fileUri: string): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new Error('El visor de PDF solo está disponible en Android.');
  }
  const contentUri = await FileSystem.getContentUriAsync(fileUri);
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    flags: FLAG_GRANT_READ_URI_PERMISSION,
    type: 'application/pdf',
  });
}
