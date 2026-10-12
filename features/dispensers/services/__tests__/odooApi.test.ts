import { validateOdooEquipment } from '../odooApi';

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { api } = require('@/lib/api');

describe('validateOdooEquipment', () => {
  it('con equipos=[] no llama al backend y devuelve []', async () => {
    const result = await validateOdooEquipment([]);

    expect(api.post).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('hace POST a la URL correcta con { equipos } como body', async () => {
    api.post.mockResolvedValueOnce({
      data: { data: [], message: null },
    });

    await validateOdooEquipment(['SN-001', 'SN-002']);

    expect(api.post).toHaveBeenCalledWith('/dispenser-movements/odoo/validate-equipment', {
      equipos: ['SN-001', 'SN-002'],
    });
  });

  it('parsea el contrato real: objeto { success, equipos }, con campos que cambian según disponibilidad', async () => {
    // JSON real confirmado contra stage.
    api.post.mockResolvedValueOnce({
      data: {
        data: {
          success: true,
          equipos: [
            {
              serie: 'TEST-LOOP-01',
              serie_odoo: 'TEST-LOOP-01',
              disponible: true,
              ubicacion: 'AC/EQUIPOS FC REPARADOS',
            },
            {
              serie: 'NO-EXISTE-999',
              disponible: false,
              motivo: 'El número de serie no existe en Odoo',
            },
          ],
        },
        message: null,
      },
    });

    const result = await validateOdooEquipment(['TEST-LOOP-01', 'NO-EXISTE-999']);

    expect(result).toEqual([
      {
        serie: 'TEST-LOOP-01',
        disponible: true,
        motivo: null,
        serie_odoo: 'TEST-LOOP-01',
        ubicacion: 'AC/EQUIPOS FC REPARADOS',
      },
      {
        serie: 'NO-EXISTE-999',
        disponible: false,
        motivo: 'El número de serie no existe en Odoo',
        serie_odoo: null,
        ubicacion: null,
      },
    ]);
  });

  it('devuelve [] si data no trae la lista `equipos` (o no es objeto)', async () => {
    api.post.mockResolvedValueOnce({
      data: { data: { success: true }, message: null },
    });

    const result = await validateOdooEquipment(['SN-001']);

    expect(result).toEqual([]);
  });

  it('normaliza disponible que no es exactamente `true` a false', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        data: {
          success: true,
          equipos: [
            { serie: 'SN-001', disponible: 'true' },
            { serie: 'SN-002', disponible: 1 },
            { serie: 'SN-003', disponible: undefined },
          ],
        },
        message: null,
      },
    });

    const result = await validateOdooEquipment(['SN-001', 'SN-002', 'SN-003']);

    expect(result).toEqual([
      { serie: 'SN-001', disponible: false, motivo: null, serie_odoo: null, ubicacion: null },
      { serie: 'SN-002', disponible: false, motivo: null, serie_odoo: null, ubicacion: null },
      { serie: 'SN-003', disponible: false, motivo: null, serie_odoo: null, ubicacion: null },
    ]);
  });

  it('normaliza motivo/serie_odoo/ubicacion ausentes a null', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        data: { success: true, equipos: [{ serie: 'SN-001', disponible: true }] },
        message: null,
      },
    });

    const result = await validateOdooEquipment(['SN-001']);

    expect(result).toEqual([
      { serie: 'SN-001', disponible: true, motivo: null, serie_odoo: null, ubicacion: null },
    ]);
  });

  it('descarta items sin `serie` válida (ausente, no-string o vacía)', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        data: {
          success: true,
          equipos: [
            { serie: 'SN-001', disponible: true },
            { disponible: true },
            { serie: 123, disponible: true },
            { serie: '', disponible: true },
            null,
            'not-an-object',
          ],
        },
        message: null,
      },
    });

    const result = await validateOdooEquipment(['SN-001']);

    expect(result).toEqual([
      { serie: 'SN-001', disponible: true, motivo: null, serie_odoo: null, ubicacion: null },
    ]);
  });

  it('en un shape inesperado (peor caso) devuelve [] sin explotar', async () => {
    api.post.mockResolvedValueOnce({
      data: { data: 'respuesta-rara-de-string', message: null },
    });

    const result = await validateOdooEquipment(['SN-001']);

    expect(result).toEqual([]);
  });

  it('propaga el error si el POST falla', async () => {
    const apiError = new Error('Odoo no disponible');
    api.post.mockRejectedValueOnce(apiError);

    await expect(validateOdooEquipment(['SN-001'])).rejects.toThrow('Odoo no disponible');
  });
});
