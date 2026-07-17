import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';

const APK_PATH = `${FileSystem.cacheDirectory}loop-update.apk`;

// FLAG_GRANT_READ_URI_PERMISSION: el instalador necesita poder leer el content:// URI.
const FLAG_GRANT_READ_URI_PERMISSION = 1;

/**
 * Descarga el APK mostrando progreso (0..1). Devuelve el uri local del archivo.
 */
export async function downloadApk(
  url: string,
  onProgress: (ratio: number) => void,
): Promise<string> {
  // Limpia una descarga previa que haya quedado a medias.
  await FileSystem.deleteAsync(APK_PATH, { idempotent: true });

  const resumable = FileSystem.createDownloadResumable(url, APK_PATH, {}, (p) => {
    if (p.totalBytesExpectedToWrite > 0) {
      onProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
    }
  });

  const result = await resumable.downloadAsync();
  if (!result?.uri) {
    throw new Error('No se pudo descargar la actualización.');
  }
  return result.uri;
}

/**
 * Lanza el instalador del sistema para el APK descargado (Android).
 * El usuario debe permitir "instalar apps de origen desconocido" la primera vez.
 */
export async function installApk(fileUri: string): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new Error('La instalación automática solo está disponible en Android.');
  }
  const contentUri = await FileSystem.getContentUriAsync(fileUri);
  await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
    data: contentUri,
    flags: FLAG_GRANT_READ_URI_PERMISSION,
  });
}
