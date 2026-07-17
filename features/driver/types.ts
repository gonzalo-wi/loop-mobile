export type OrderableProduct = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  allowsUnit: boolean;
  allowsBulk: boolean;
  unitsPerBulk: number | null;
  active: boolean;
};

export type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export type OrderItem = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  allowsUnit: boolean;
  allowsBulk: boolean;
  unitsPerBulk: number | null;
  unitQuantity: number;
  bulkQuantity: number | null;
};

export type Order = {
  id: string;
  routeId: string;
  routeCode: string;
  status: OrderStatus;
  orderDate: string;
  observations: string | null;
  items: OrderItem[];
  startedBy: string | null;
  startedByName: string | null;
  startedAt: string | null;
  completedBy: string | null;
  completedByName: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateOrderItemPayload = {
  productId: string;
  unitQuantity?: number;
  bulkQuantity?: number | null;
};

export type CreateOrderPayload = {
  routeId: string;
  orderDate?: string;
  observations?: string;
  items: CreateOrderItemPayload[];
};
