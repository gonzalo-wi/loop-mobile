import { canAccessDispensers } from '../access';

describe('canAccessDispensers', () => {
  it.each(['ADMIN', 'CONTROLADOR'])('allows %s', (role) => {
    expect(canAccessDispensers(role)).toBe(true);
  });

  // PICKER and CARGADOR_DISPENSERS were merged into CONTROLADOR in the backend.
  it.each(['SUPERVISOR', 'REPARTIDOR', 'PICKER', 'CARGADOR_DISPENSERS', undefined])('denies %s', (role) => {
    expect(canAccessDispensers(role)).toBe(false);
  });
});
