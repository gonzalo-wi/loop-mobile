import { canShowTruckMap } from '../mapAvailability';

describe('canShowTruckMap', () => {
  it('shows the map in Expo Go, which ships its own Google Maps key', () => {
    expect(canShowTruckMap({ isExpoGo: true, hasGoogleMapsKey: false })).toBe(true);
  });
  it('shows the map in a build that was given a key', () => {
    expect(canShowTruckMap({ isExpoGo: false, hasGoogleMapsKey: true })).toBe(true);
  });
  it('hides the map in a build without a key, where the Maps SDK would crash', () => {
    expect(canShowTruckMap({ isExpoGo: false, hasGoogleMapsKey: false })).toBe(false);
  });
});
