import { getOdooAvailableEquipment, validateOdooEquipment } from '../odooApi';
import type { OdooAvailableEquipment, OdooEquipment } from '../../types';

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { api } = require('@/lib/api');

function buildEquipment(overrides: Partial<OdooEquipment> = {}): OdooEquipment {
  return {
    serie: 'SN-001',
    producto: 'Dispenser Frío/Calor',
    ubicacion: 'Depósito Central',
    fecha_disponible: '2026-08-10',
    ...overrides,
  };
}

function buildAvailablePage(overrides: Partial<OdooAvailableEquipment> = {}): OdooAvailableEquipment {
  return {
    success: true,
    total: 1,
    devueltos: 1,
    equipos: [buildEquipment()],
    ...overrides,
  };
}

describe('getOdooAvailableEquipment', () => {
  it('llama a la URL correcta con limite/offset', async () => {
    api.get.mockResolvedValueOnce({
      data: { data: buildAvailablePage(), message: null },
    });

    await getOdooAvailableEquipment();

    expect(api.get).toHaveBeenCalledWith('/dispenser-movements/odoo/available-equipment', {
      params: { limite: 100, offset: 0 },
    });
  });

  it('devuelve res.data.data.equipos cuando total <= devueltos (una sola página)', async () => {
    const equipos = [buildEquipment({ serie: 'SN-001' }), buildEquipment({ serie: 'SN-002' })];
    api.get.mockResolvedValueOnce({
      data: {
        data: buildAvailablePage({ total: 2, devueltos: 2, equipos }),
        message: null,
      },
    });

    const result = await getOdooAvailableEquipment();

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(result).toEqual(equipos);
  });

  it('pagina cuando total > devueltos: junta todos los equipos y llama con offset incrementado', async () => {
    const page1Equipos = [buildEquipment({ serie: 'SN-001' }), buildEquipment({ serie: 'SN-002' })];
    const page2Equipos = [buildEquipment({ serie: 'SN-003' })];

    api.get
      .mockResolvedValueOnce({
        data: {
          data: buildAvailablePage({ total: 3, devueltos: 2, equipos: page1Equipos }),
          message: null,
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: buildAvailablePage({ total: 3, devueltos: 1, equipos: page2Equipos }),
          message: null,
        },
      });

    const result = await getOdooAvailableEquipment();

    expect(api.get).toHaveBeenCalledTimes(2);
    expect(api.get).toHaveBeenNthCalledWith(1, '/dispenser-movements/odoo/available-equipment', {
      params: { limite: 100, offset: 0 },
    });
    expect(api.get).toHaveBeenNthCalledWith(2, '/dispenser-movements/odoo/available-equipment', {
      params: { limite: 100, offset: 2 },
    });
    expect(result).toEqual([...page1Equipos, ...page2Equipos]);
  });

  it('corta el loop cuando ya juntó `total` (no pide una tercera página de más)', async () => {
    const page1Equipos = [buildEquipment({ serie: 'SN-001' })];
    const page2Equipos = [buildEquipment({ serie: 'SN-002' })];

    api.get
      .mockResolvedValueOnce({
        data: {
          data: buildAvailablePage({ total: 2, devueltos: 1, equipos: page1Equipos }),
          message: null,
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: buildAvailablePage({ total: 2, devueltos: 1, equipos: page2Equipos }),
          message: null,
        },
      });

    const result = await getOdooAvailableEquipment();

    expect(api.get).toHaveBeenCalledTimes(2);
    expect(result).toEqual([...page1Equipos, ...page2Equipos]);
  });

  it('corta el loop si el backend devuelve una página vacía (devueltos <= 0) para evitar loop infinito', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        data: buildAvailablePage({ total: 5, devueltos: 0, equipos: [] }),
        message: null,
      },
    });

    const result = await getOdooAvailableEquipment();

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
  });

  it('propaga el error si el GET falla', async () => {
    const apiError = new Error('Odoo no responde');
    api.get.mockRejectedValueOnce(apiError);

    await expect(getOdooAvailableEquipment()).rejects.toThrow('Odoo no responde');
  });
});

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

  it('parsea data como array plano', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        data: [
          { serie: 'SN-001', disponible: true, motivo: null },
          { serie: 'SN-002', disponible: false, motivo: 'Ya asignado' },
        ],
        message: null,
      },
    });

    const result = await validateOdooEquipment(['SN-001', 'SN-002']);

    expect(result).toEqual([
      { serie: 'SN-001', disponible: true, motivo: null },
      { serie: 'SN-002', disponible: false, motivo: 'Ya asignado' },
    ]);
  });

  it('parsea data envuelto en { resultados: [...] }', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        data: {
          resultados: [{ serie: 'SN-001', disponible: true, motivo: null }],
        },
        message: null,
      },
    });

    const result = await validateOdooEquipment(['SN-001']);

    expect(result).toEqual([{ serie: 'SN-001', disponible: true, motivo: null }]);
  });

  it('parsea data envuelto en { equipos: [...] }', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        data: {
          equipos: [{ serie: 'SN-001', disponible: false, motivo: 'No encontrado en Odoo' }],
        },
        message: null,
      },
    });

    const result = await validateOdooEquipment(['SN-001']);

    expect(result).toEqual([{ serie: 'SN-001', disponible: false, motivo: 'No encontrado en Odoo' }]);
  });

  it('normaliza disponible que no es exactamente `true` a false', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        data: [
          { serie: 'SN-001', disponible: 'true', motivo: null },
          { serie: 'SN-002', disponible: 1, motivo: null },
          { serie: 'SN-003', disponible: undefined, motivo: null },
        ],
        message: null,
      },
    });

    const result = await validateOdooEquipment(['SN-001', 'SN-002', 'SN-003']);

    expect(result).toEqual([
      { serie: 'SN-001', disponible: false, motivo: null },
      { serie: 'SN-002', disponible: false, motivo: null },
      { serie: 'SN-003', disponible: false, motivo: null },
    ]);
  });

  it('normaliza motivo ausente a null', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        data: [{ serie: 'SN-001', disponible: true }],
        message: null,
      },
    });

    const result = await validateOdooEquipment(['SN-001']);

    expect(result).toEqual([{ serie: 'SN-001', disponible: true, motivo: null }]);
  });

  it('descarta items sin `serie` válida (ausente, no-string o vacía)', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        data: [
          { serie: 'SN-001', disponible: true, motivo: null },
          { disponible: true, motivo: null },
          { serie: 123, disponible: true, motivo: null },
          { serie: '', disponible: true, motivo: null },
          null,
          'not-an-object',
        ],
        message: null,
      },
    });

    const result = await validateOdooEquipment(['SN-001']);

    expect(result).toEqual([{ serie: 'SN-001', disponible: true, motivo: null }]);
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
