/** Info de la última versión disponible (GET /app/version). */
export type AppVersionInfo = {
  /** Última versión publicada, ej: "1.1.0". */
  latestVersion: string;
  /** URL directa al APK para descargar. */
  apkUrl: string;
  /** Si es true, la actualización es obligatoria y bloquea el uso de la app. */
  mandatory: boolean;
  /** Notas de la versión (opcional, para mostrar al usuario). */
  notes?: string;
};
