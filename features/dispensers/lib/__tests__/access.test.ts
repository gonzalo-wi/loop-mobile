import { canAccessDispensers } from '../access';

describe('canAccessDispensers', () => {
  it.each(['ADMIN', 'CONTROLADOR', 'SUPERVISOR'])('allows %s', (role) => {
    expect(canAccessDispensers(role)).toBe(true);
  });

  // PICKER and CARGADOR_DISPENSERS were merged into CONTROLADOR in the backend.
  it.each(['REPARTIDOR', 'PICKER', 'CARGADOR_DISPENSERS', undefined])('denies %s', (role) => {
    expect(canAccessDispensers(role)).toBe(false);
  });
});
