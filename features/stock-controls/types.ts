export type Route = {
  id: string;
  code: string;
  branchId: string;
  branchName: string;
  branchCode: string;
  driverId: string | null;
  driverName: string | null;
  truckPlate: string | null;
  active: boolean;
};

export type Product = {
  id: string;
  code: string;
  name: string;
  displayOrder: number;
  description: string | null;
  type: 'RETORNABLE' | 'DESCARTABLE';
  unit: string;
  packQuantity: number;
  active: boolean;
};

export type StockControlType = 'EXIT' | 'ENTRY';

export type StockControlStatus =
  | 'CONTROLLED'
  | 'PENDING_DRIVER_APPROVAL'
  | 'ACCEPTED_BY_DRIVER'
  | 'REJECTED_BY_DRIVER'
  | 'WITH_DIFFERENCES'
  | 'SENT_TO_AGUAS'
  | 'AGUAS_ERROR'
  | 'CANCELLED';

export type StockControlItem = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  productUnit: string;
  totalQuantity: number;
  fullQuantity: number;
  exchangeQuantity: number;
  differenceQuantity: number | null;
  observations: string | null;
};

export type StockControl = {
  id: string;
  type: StockControlType;
  status: StockControlStatus;
  branchId: string;
  branchName: string;
  routeId: string;
  routeCode: string;
  controllerId: string | null;
  controlDate: string;
  truckOrdered: boolean;
  observations: string | null;
  items: StockControlItem[];
  confirmedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BundleQuantity = {
  bundles: number;
  looseUnits: number;
  totalUnits: number;
};

export type ProductControlValues = {
  full: BundleQuantity;
  total: BundleQuantity;
  exchanges: number;
  observations: string;
};

export type CreateControlItemPayload = {
  productId: string;
  totalQuantity: number;
  fullQuantity: number;
  exchangeQuantity: number;
  observations?: string;
};

export type CreateControlPayload = {
  type: StockControlType;
  branchId: string;
  routeId: string;
  controllerId: string;
  controlDate?: string;
  truckOrdered: boolean;
  observations?: string;
  items: CreateControlItemPayload[];
};

export type PendingRoute = {
  routeId: string;
  routeCode: string;
  branchId: string;
  branchName: string;
  exitControlId: string;
  controlDate: string;
};

export type PendingArrivals = {
  date: string;
  totalExpected: number;
  arrived: number;
  pending: number;
  pendingRoutes: PendingRoute[];
};

export type PaginatedResponse<T> = {
  data: {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
  };
  message?: string;
};
