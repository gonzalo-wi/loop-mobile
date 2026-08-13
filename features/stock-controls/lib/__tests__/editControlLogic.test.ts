import {
  isControlCorrectable,
  validateCorrectionReason,
  buildInitialFormValues,
  buildItems,
} from '../editControlLogic';
import type {
  Product,
  ProductControlValues,
  StockControlItem,
  StockControlType,
  StockControlStatus,
} from '../../types';

function buildControlBase(overrides: {
  type?: StockControlType;
  status?: StockControlStatus;
} = {}) {
  return {
    type: overrides.type ?? 'ENTRY',
    status: overrides.status ?? 'SENT_TO_AGUAS',
  } as const;
}

describe('isControlCorrectable', () => {
  it('es true cuando type=ENTRY, status=SENT_TO_AGUAS y role=SUPERVISOR', () => {
    expect(
      isControlCorrectable(buildControlBase({ type: 'ENTRY', status: 'SENT_TO_AGUAS' }), 'SUPERVISOR'),
    ).toBe(true);
  });

  it('es true cuando type=ENTRY, status=AGUAS_ERROR y role=SUPERVISOR', () => {
    expect(
      isControlCorrectable(buildControlBase({ type: 'ENTRY', status: 'AGUAS_ERROR' }), 'SUPERVISOR'),
    ).toBe(true);
  });

  it('es false cuando type=EXIT (aunque status y role sean correctos)', () => {
    expect(
      isControlCorrectable(buildControlBase({ type: 'EXIT', status: 'SENT_TO_AGUAS' }), 'SUPERVISOR'),
    ).toBe(false);
  });

  it('es false cuando el status no es SENT_TO_AGUAS ni AGUAS_ERROR', () => {
    expect(
      isControlCorrectable(buildControlBase({ type: 'ENTRY', status: 'CONTROLLED' }), 'SUPERVISOR'),
    ).toBe(false);
    expect(
      isControlCorrectable(buildControlBase({ type: 'ENTRY', status: 'ACCEPTED_BY_DRIVER' }), 'SUPERVISOR'),
    ).toBe(false);
    expect(
      isControlCorrectable(buildControlBase({ type: 'ENTRY', status: 'WITH_DIFFERENCES' }), 'SUPERVISOR'),
    ).toBe(false);
    expect(
      isControlCorrectable(buildControlBase({ type: 'ENTRY', status: 'CANCELLED' }), 'SUPERVISOR'),
    ).toBe(false);
  });

  it('es false cuando el usuario no es SUPERVISOR', () => {
    expect(
      isControlCorrectable(buildControlBase({ type: 'ENTRY', status: 'SENT_TO_AGUAS' }), 'CONTROLLER'),
    ).toBe(false);
    expect(
      isControlCorrectable(buildControlBase({ type: 'ENTRY', status: 'SENT_TO_AGUAS' }), 'DRIVER'),
    ).toBe(false);
  });

  it('es false cuando no hay usuario logueado (role undefined)', () => {
    expect(
      isControlCorrectable(buildControlBase({ type: 'ENTRY', status: 'SENT_TO_AGUAS' }), undefined),
    ).toBe(false);
  });

  it('es false cuando ninguna de las 3 condiciones se cumple', () => {
    expect(
      isControlCorrectable(buildControlBase({ type: 'EXIT', status: 'CONTROLLED' }), 'DRIVER'),
    ).toBe(false);
  });
});

describe('validateCorrectionReason', () => {
  it('rechaza un motivo vacío', () => {
    expect(validateCorrectionReason('')).toBe('Ingresá el motivo de la corrección');
  });

  it('rechaza un motivo compuesto solo de espacios', () => {
    expect(validateCorrectionReason('    ')).toBe('Ingresá el motivo de la corrección');
  });

  it('rechaza un motivo de más de 500 caracteres (tras trim)', () => {
    const longReason = 'a'.repeat(501);
    expect(validateCorrectionReason(longReason)).toBe('Máximo 500 caracteres');
  });

  it('acepta un motivo de exactamente 500 caracteres', () => {
    const reason = 'a'.repeat(500);
    expect(validateCorrectionReason(reason)).toBeNull();
  });

  it('acepta un motivo válido normal', () => {
    expect(validateCorrectionReason('Diferencia detectada en el conteo físico')).toBeNull();
  });

  it('no cuenta espacios de borde para el límite de 500', () => {
    const reason = '  ' + 'a'.repeat(500) + '  ';
    expect(validateCorrectionReason(reason)).toBeNull();
  });
});

describe('buildItems', () => {
  const product: Product = {
    id: 'prod-1',
    code: 'P001',
    name: 'Bidón 20L',
    displayOrder: 1,
    description: null,
    type: 'RETORNABLE',
    unit: 'unidad',
    packQuantity: 1,
    active: true,
  };

  const emptyValues: ProductControlValues = {
    full: { bundles: 0, looseUnits: 0, totalUnits: 0 },
    total: { bundles: 0, looseUnits: 0, totalUnits: 0 },
    exchanges: 0,
    observations: '',
  };

  it('devuelve array vacío si no hay productos', () => {
    expect(buildItems([], {})).toEqual([]);
  });

  it('excluye productos sin cantidades cargadas (total=0, full=0, exchanges=0)', () => {
    const result = buildItems([product], { [product.id]: emptyValues });
    expect(result).toEqual([]);
  });

  it('incluye un producto con total cargado', () => {
    const values: ProductControlValues = {
      ...emptyValues,
      total: { bundles: 0, looseUnits: 0, totalUnits: 5 },
    };
    const result = buildItems([product], { [product.id]: values });
    expect(result).toEqual([
      {
        productId: 'prod-1',
        totalQuantity: 5,
        fullQuantity: 0,
        exchangeQuantity: 0,
        observations: undefined,
      },
    ]);
  });

  it('incluye un producto que solo tiene recambios cargados', () => {
    const values: ProductControlValues = { ...emptyValues, exchanges: 3 };
    const result = buildItems([product], { [product.id]: values });
    expect(result).toHaveLength(1);
    expect(result[0].exchangeQuantity).toBe(3);
  });

  it('recorta y descarta observaciones vacías (trim -> undefined)', () => {
    const values: ProductControlValues = {
      ...emptyValues,
      total: { bundles: 0, looseUnits: 0, totalUnits: 1 },
      observations: '   ',
    };
    const result = buildItems([product], { [product.id]: values });
    expect(result[0].observations).toBeUndefined();
  });

  it('preserva observaciones no vacías recortadas', () => {
    const values: ProductControlValues = {
      ...emptyValues,
      total: { bundles: 0, looseUnits: 0, totalUnits: 1 },
      observations: '  faltante en pallet  ',
    };
    const result = buildItems([product], { [product.id]: values });
    expect(result[0].observations).toBe('faltante en pallet');
  });

  it('usa EMPTY_PRODUCT_VALUES si un producto no tiene entrada en formValues', () => {
    const result = buildItems([product], {});
    expect(result).toEqual([]);
  });
});

describe('buildInitialFormValues', () => {
  const productWithoutPack: Product = {
    id: 'prod-1',
    code: 'P001',
    name: 'Bidón 20L',
    displayOrder: 1,
    description: null,
    type: 'RETORNABLE',
    unit: 'unidad',
    packQuantity: 1,
    active: true,
  };

  const productWithPack: Product = {
    id: 'prod-2',
    code: 'P002',
    name: 'Botella 500ml (pack x6)',
    displayOrder: 2,
    description: null,
    type: 'DESCARTABLE',
    unit: 'pack',
    packQuantity: 6,
    active: true,
  };

  function buildItem(overrides: Partial<StockControlItem>): StockControlItem {
    return {
      id: 'item-1',
      productId: productWithoutPack.id,
      productCode: 'P001',
      productName: 'Bidón 20L',
      productUnit: 'unidad',
      totalQuantity: 0,
      fullQuantity: 0,
      exchangeQuantity: 0,
      differenceQuantity: null,
      observations: null,
      ...overrides,
    };
  }

  it('devuelve EMPTY_PRODUCT_VALUES para productos sin item previo (permite agregar productos nuevos al corregir)', () => {
    const result = buildInitialFormValues([productWithoutPack], []);
    expect(result[productWithoutPack.id]).toEqual({
      full: { bundles: 0, looseUnits: 0, totalUnits: 0 },
      total: { bundles: 0, looseUnits: 0, totalUnits: 0 },
      exchanges: 0,
      observations: '',
    });
  });

  it('precarga valores desde los items existentes del control (producto sin pack)', () => {
    const item = buildItem({
      productId: productWithoutPack.id,
      totalQuantity: 10,
      fullQuantity: 8,
      exchangeQuantity: 2,
      observations: 'ok',
    });
    const result = buildInitialFormValues([productWithoutPack], [item]);
    expect(result[productWithoutPack.id]).toEqual({
      full: { bundles: 0, looseUnits: 0, totalUnits: 8 },
      total: { bundles: 0, looseUnits: 0, totalUnits: 10 },
      exchanges: 2,
      observations: 'ok',
    });
  });

  it('calcula bundles/looseUnits correctamente para productos con packQuantity > 1', () => {
    const item = buildItem({
      productId: productWithPack.id,
      totalQuantity: 20,
      fullQuantity: 14,
      exchangeQuantity: 0,
    });
    const result = buildInitialFormValues([productWithPack], [item]);
    expect(result[productWithPack.id]).toEqual({
      full: { bundles: 2, looseUnits: 2, totalUnits: 14 },
      total: { bundles: 3, looseUnits: 2, totalUnits: 20 },
      exchanges: 0,
      observations: '',
    });
  });

  it('usa observations vacío ("") cuando el item tiene observations null', () => {
    const item = buildItem({ observations: null });
    const result = buildInitialFormValues([productWithoutPack], [item]);
    expect(result[productWithoutPack.id].observations).toBe('');
  });
});
