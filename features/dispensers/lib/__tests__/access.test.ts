import { canAccessDispensers } from '../access';

describe('canAccessDispensers', () => {
  it.each(['ADMIN', 'CONTROLADOR', 'PICKER', 'CARGADOR_DISPENSERS'])('allows %s', (role) => {
    expect(canAccessDispensers(role)).toBe(true);
  });

  it.each(['SUPERVISOR', 'REPARTIDOR', undefined])('denies %s', (role) => {
    expect(canAccessDispensers(role)).toBe(false);
  });
});
