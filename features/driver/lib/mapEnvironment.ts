import Constants, { ExecutionEnvironment } from 'expo-constants';
import { canShowTruckMap } from './mapAvailability';

/** Read once: both values are fixed for the lifetime of the installed build. */
export const TRUCK_MAP_ENABLED = canShowTruckMap({
  isExpoGo: Constants.executionEnvironment === ExecutionEnvironment.StoreClient,
  hasGoogleMapsKey: Constants.expoConfig?.extra?.hasGoogleMapsKey === true,
});
