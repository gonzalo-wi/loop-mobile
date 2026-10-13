import {
  fleetErrorMessage,
  formatSignal,
  isLocationStale,
  relativeShort,
  truckMapUrls,
  vehicleStatus,
} from '../fleetStatus';

// Local times, like the device shows them.
const NOW = new Date(2026, 9, 12, 10, 0, 0);

describe('isLocationStale', () => {
  it('is fresh under 15 minutes', () => {
    expect(isLocationStale(new Date(2026, 9, 12, 9, 46).toISOString(), NOW)).toBe(false);
  });
  it('is stale from 15 minutes on', () => {
    expect(isLocationStale(new Date(2026, 9, 12, 9, 45).toISOString(), NOW)).toBe(true);
  });
  it('treats an unparseable date as stale', () => {
    expect(isLocationStale('not-a-date', NOW)).toBe(true);
  });
});

describe('formatSignal', () => {
  it('says "Hoy" for a report from today', () => {
    expect(formatSignal(new Date(2026, 9, 12, 7, 5).toISOString(), NOW)).toBe('Hoy, 07:05');
  });
  it('shows day and month for an older report', () => {
    expect(formatSignal(new Date(2026, 9, 11, 23, 59).toISOString(), NOW)).toBe('11/10, 23:59');
  });
  it('does not call a report from the same day of another year "Hoy"', () => {
    expect(formatSignal(new Date(2025, 9, 12, 8, 0).toISOString(), NOW)).toBe('12/10, 08:00');
  });
  it('returns the raw value when it is not a date', () => {
    expect(formatSignal('sin fecha', NOW)).toBe('sin fecha');
  });
});

describe('relativeShort', () => {
  const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000);
  it('is empty before the first update', () => {
    expect(relativeShort(null, NOW)).toBe('');
  });
  it.each([
    [10, 'hace unos segundos'],
    [60, 'hace 1 min'],
    [5 * 60, 'hace 5 min'],
    [2 * 3600, 'hace 2 h'],
  ])('%i seconds ago → %s', (seconds, expected) => {
    expect(relativeShort(ago(seconds), NOW)).toBe(expected);
  });
});

describe('vehicleStatus', () => {
  it('reports the engine off first', () => {
    expect(vehicleStatus({ engineOn: false, speed: 30 })).toEqual({ text: 'Motor apagado', tone: 'neutral' });
  });
  it('reports the speed while moving', () => {
    expect(vehicleStatus({ engineOn: true, speed: 42 })).toEqual({ text: 'En movimiento · 42 km/h', tone: 'ok' });
  });
  it('warns when stopped with the engine on', () => {
    expect(vehicleStatus({ engineOn: true, speed: 0 })).toEqual({ text: 'Detenido · motor encendido', tone: 'warn' });
  });
});

describe('fleetErrorMessage', () => {
  it('explains a truck missing from the fleet system', () => {
    expect(fleetErrorMessage(404)).toMatch(/No se encontró el camión/);
  });
  it('explains the fleet system being unreachable', () => {
    expect(fleetErrorMessage(502)).toMatch(/No se pudo conectar con el sistema de flota/);
  });
  it('falls back to the error message, then to a generic one', () => {
    expect(fleetErrorMessage(500, 'Timeout')).toBe('Timeout');
    expect(fleetErrorMessage(undefined)).toBe('No se pudo obtener la ubicación.');
  });
});

describe('truckMapUrls', () => {
  it('builds an Android geo link that drops a labelled pin on the truck', () => {
    expect(truckMapUrls(-34.60372, -58.38159, 'AB123CD').native).toBe(
      'geo:-34.60372,-58.38159?q=-34.60372,-58.38159(Cami%C3%B3n%20AB123CD)',
    );
  });
  it('builds a web fallback with the coordinates as the query', () => {
    expect(truckMapUrls(-34.60372, -58.38159, 'AB123CD').web).toBe(
      'https://www.google.com/maps/search/?api=1&query=-34.60372%2C-58.38159',
    );
  });
});
