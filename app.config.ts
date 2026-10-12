import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extends app.json with values that must not live in the repo. The Google Maps
 * key (Mi camión) comes from the build environment (EAS env var or local .env);
 * Expo Go uses its own key. Builds without it hide the map instead of crashing.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || undefined;
  return {
    ...(config as ExpoConfig),
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: { apiKey: googleMapsApiKey },
      },
    },
    extra: {
      ...config.extra,
      hasGoogleMapsKey: googleMapsApiKey !== undefined,
    },
  };
};
