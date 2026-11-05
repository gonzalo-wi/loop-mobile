/** Rendición del repartidor (GET /settlements/me, spec 007 del backend). */

export type SettlementState =
  | 'WAITING_ENTRY'
  | 'NO_ROUTE_NUMBER'
  | 'NOT_LOADED'
  | 'UNAVAILABLE'
  | 'AVAILABLE';

export type DifferenceType = 'SURPLUS' | 'SHORTAGE' | 'NONE';

export type StatusGroup = 'PENDING' | 'READY' | 'CLOSED' | 'NO_DEPOSIT';

/** Números de tesorería (PAC). Los montos esperados son null hasta que Aguas los carga. */
export type SettlementFigures = {
  expectedCash: number | null;
  expectedChecks: number | null;
  expectedWithholdings: number | null;
  expectedTotal: number | null;
  depositedCash: number;
  confirmedChecks: number;
  confirmedWithholdings: number;
  totalReceived: number;
  /** Null hasta que tesorería procesa el reparto. */
  difference: number | null;
  differenceType: DifferenceType | null;
  statusGroup: StatusGroup;
  /** ISO con zona. */
  expectedUpdatedAt: string | null;
  lastDepositAt: string | null;
};

export type RouteSettlement = {
  routeId: string;
  routeCode: string;
  state: SettlementState;
  /** Solo cuando state es AVAILABLE. */
  figures: SettlementFigures | null;
};

export type DriverSettlement = {
  /** Fecha calendario "2026-11-05". */
  date: string;
  routes: RouteSettlement[];
};
