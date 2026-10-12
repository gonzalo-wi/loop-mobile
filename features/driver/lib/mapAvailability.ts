type MapEnvironment = {
  /** Running inside Expo Go (development), which bundles its own Google Maps key. */
  isExpoGo: boolean;
  /** The build was made with GOOGLE_MAPS_API_KEY set (see app.config.ts). */
  hasGoogleMapsKey: boolean;
};

/**
 * Whether Mi camión can mount the map. Without a key the Android Maps SDK
 * throws on mount and closes the app, so a keyless build falls back to the
 * "Abrir en el mapa" button only.
 */
export function canShowTruckMap({ isExpoGo, hasGoogleMapsKey }: MapEnvironment): boolean {
  return isExpoGo || hasGoogleMapsKey;
}
