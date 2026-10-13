import { remitoErrorMessage } from '../remitoErrorMessage';

describe('remitoErrorMessage', () => {
  it.each([404, 409])('tells the driver there is no remito for today on %i, hiding the backend text', (status) => {
    expect(remitoErrorMessage(status)).toBe('No tenés un remito disponible para hoy.');
  });
  it('asks to retry on server or network failures', () => {
    expect(remitoErrorMessage(500)).toBe('No se pudo obtener el remito. Probá de nuevo en unos minutos.');
    expect(remitoErrorMessage(undefined)).toBe('No se pudo obtener el remito. Probá de nuevo en unos minutos.');
  });
});
