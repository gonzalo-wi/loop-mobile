import type {
  Product,
  ProductControlValues,
  StockControl,
  StockControlItem,
} from '../types';

export const REASON_MAX_LENGTH = 500;

export const EMPTY_PRODUCT_VALUES: ProductControlValues = {
  full: { bundles: 0, looseUnits: 0, totalUnits: 0 },
  total: { bundles: 0, looseUnits: 0, totalUnits: 0 },
  exchanges: 0,
  observations: '',
};

/**
 * Determina si un control puede corregirse: solo controles ENTRY ya
 * enviados (o con error) a Aguas, y solo para usuarios SUPERVISOR.
 */
export function isControlCorrectable(
  control: Pick<StockControl, 'type' | 'status'>,
  userRole: string | undefined,
): boolean {
  return (
    control.type === 'ENTRY' &&
    (control.status === 'SENT_TO_AGUAS' || control.status === 'AGUAS_ERROR') &&
    userRole === 'SUPERVISOR'
  );
}

/** Motivo de corrección inválido: vacío o por encima del máximo permitido. */
export function validateCorrectionReason(reason: string): string | null {
  const trimmed = reason.trim();
  if (!trimmed) return 'Ingresá el motivo de la corrección';
  if (trimmed.length > REASON_MAX_LENGTH) return `Máximo ${REASON_MAX_LENGTH} caracteres`;
  return null;
}

export function buildInitialFormValues(
  products: Product[],
  items: StockControlItem[],
): Record<string, ProductControlValues> {
  const itemMap = new Map(items.map((item) => [item.productId, item]));
  const result: Record<string, ProductControlValues> = {};

  for (const product of products) {
    const item = itemMap.get(product.id);
    if (!item) {
      result[product.id] = EMPTY_PRODUCT_VALUES;
      continue;
    }

    const hasBundles = product.packQuantity > 1;
    if (hasBundles) {
      result[product.id] = {
        full: {
          bundles: Math.floor(item.fullQuantity / product.packQuantity),
          looseUnits: item.fullQuantity % product.packQuantity,
          totalUnits: item.fullQuantity,
        },
        total: {
          bundles: Math.floor(item.totalQuantity / product.packQuantity),
          looseUnits: item.totalQuantity % product.packQuantity,
          totalUnits: item.totalQuantity,
        },
        exchanges: item.exchangeQuantity,
        observations: item.observations ?? '',
      };
    } else {
      result[product.id] = {
        full: { bundles: 0, looseUnits: 0, totalUnits: item.fullQuantity },
        total: { bundles: 0, looseUnits: 0, totalUnits: item.totalQuantity },
        exchanges: item.exchangeQuantity,
        observations: item.observations ?? '',
      };
    }
  }

  return result;
}

export function buildItems(
  products: Product[],
  formValues: Record<string, ProductControlValues>,
) {
  return products
    .map((product) => {
      const values = formValues[product.id] ?? EMPTY_PRODUCT_VALUES;
      const { full, total, exchanges, observations } = values;
      if (total.totalUnits === 0 && full.totalUnits === 0 && exchanges === 0) return null;
      return {
        productId: product.id,
        totalQuantity: total.totalUnits,
        fullQuantity: full.totalUnits,
        exchangeQuantity: exchanges,
        observations: observations.trim() || undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}
