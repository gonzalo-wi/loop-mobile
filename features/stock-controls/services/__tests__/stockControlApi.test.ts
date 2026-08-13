import { correctStockControl } from '../stockControlApi';
import type { CorrectControlPayload, StockControl } from '../../types';

jest.mock('@/lib/api', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { api } = require('@/lib/api');

function buildStockControl(overrides: Partial<StockControl> = {}): StockControl {
  return {
    id: 'ctrl-1',
    type: 'ENTRY',
    status: 'SENT_TO_AGUAS',
    branchId: 'branch-1',
    branchName: 'Sucursal Centro',
    routeId: 'route-1',
    routeCode: 'R-001',
    controllerId: 'user-1',
    controlDate: '2026-08-10',
    truckOrdered: true,
    observations: null,
    items: [],
    confirmedAt: null,
    approvedAt: null,
    createdAt: '2026-08-10T10:00:00Z',
    updatedAt: '2026-08-10T10:00:00Z',
    aguasFormulario: null,
    aguasNroRemito: null,
    ...overrides,
  };
}

describe('correctStockControl', () => {
  it('hace POST a /stock-controls/{id}/correct con el payload recibido', async () => {
    const updatedControl = buildStockControl({
      aguasFormulario: 'F-123',
      aguasNroRemito: 456,
    });
    api.post.mockResolvedValueOnce({
      data: { data: updatedControl, message: 'ok' },
    });

    const payload: CorrectControlPayload = {
      reason: 'Diferencia detectada en el conteo físico',
      observations: 'Ajuste manual',
      truckOrdered: true,
      items: [
        {
          productId: 'prod-1',
          totalQuantity: 10,
          fullQuantity: 8,
          exchangeQuantity: 2,
          observations: undefined,
        },
      ],
    };

    const result = await correctStockControl('ctrl-1', payload);

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/stock-controls/ctrl-1/correct', payload);
    expect(result).toEqual(updatedControl);
  });

  it('devuelve response.data.data (no el response completo ni response.data)', async () => {
    const updatedControl = buildStockControl();
    api.post.mockResolvedValueOnce({
      data: { data: updatedControl, message: 'Control corregido' },
    });

    const result = await correctStockControl('ctrl-1', {
      reason: 'motivo',
      items: [],
    });

    expect(result).toBe(updatedControl);
  });

  it('propaga el error si el POST falla (400/403/404/409 desde el backend)', async () => {
    const apiError = new Error('El control no puede corregirse en su estado actual');
    api.post.mockRejectedValueOnce(apiError);

    await expect(
      correctStockControl('ctrl-1', { reason: 'motivo', items: [] }),
    ).rejects.toThrow('El control no puede corregirse en su estado actual');
  });
});
