import Constants from 'expo-constants';
import * as Application from 'expo-application';

/**
 * Versión instalada. Priorizamos la versión NATIVA (versionName del APK), que es
 * la única confiable en un build standalone; `expoConfig` puede venir vacío ahí.
 * Si no se puede determinar, queda null y NO se ofrece actualización (evita
 * quedar en un bucle de "actualizá siempre").
 */
export const INSTALLED_VERSION: string | null =
  Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? null;
