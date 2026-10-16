import type { ProductControlValues, Route, StockControlType } from '../types';

/**
 * Borrador local de un control en curso. Los operarios cargan el camión entero
 * antes de guardar; si salen de la pantalla o Android mata la app, el borrador
 * permite retomarlo. Hay uno por usuario y tipo, y solo sirve el mismo día.
 */

// Bump when the shape changes: older drafts are then dropped instead of misread.
export const DRAFT_VERSION = 1;

export type ControlDraft = {
  version: typeof DRAFT_VERSION;
  userId: string;
  type: StockControlType;
  /** ISO timestamp of the last save. */
  savedAt: string;
  route: Route | null;
  truckOrdered: boolean;
  observations: string;
  /** YYYY-MM-DD, local. */
  controlDate: string;
  formValues: Record<string, ProductControlValues>;
};

export type DraftInput = {
  userId: string;
  type: StockControlType;
  route: Route | null;
  truckOrdered: boolean;
  observations: string;
  controlDate: Date;
  formValues: Record<string, ProductControlValues>;
};

/** Only worth keeping once the operator entered something; defaults alone aren't a draft. */
export function hasDraftContent(input: Pick<DraftInput, 'route' | 'observations' | 'formValues'>): boolean {
  if (input.route) return true;
  if (input.observations.trim()) return true;
  return Object.values(input.formValues).some(
    (v) =>
      v.total.totalUnits > 0 ||
      v.full.totalUnits > 0 ||
      v.exchanges > 0 ||
      v.observations.trim().length > 0,
  );
}

export function buildDraft(input: DraftInput, now: Date): ControlDraft {
  return {
    version: DRAFT_VERSION,
    userId: input.userId,
    type: input.type,
    savedAt: now.toISOString(),
    route: input.route,
    truckOrdered: input.truckOrdered,
    observations: input.observations,
    controlDate: toLocalDateString(input.controlDate),
    formValues: input.formValues,
  };
}

/** Returns the stored draft only if it is readable and belongs to this user, type and day. */
export function parseDraft(
  raw: string | null,
  expected: { userId: string; type: StockControlType },
  now: Date,
): ControlDraft | null {
  if (!raw) return null;
  let draft: ControlDraft;
  try {
    draft = JSON.parse(raw) as ControlDraft;
  } catch {
    return null;
  }
  if (draft?.version !== DRAFT_VERSION) return null;
  if (draft.userId !== expected.userId || draft.type !== expected.type) return null;
  if (toLocalDateString(new Date(draft.savedAt)) !== toLocalDateString(now)) return null;
  return draft;
}

export function draftFileName(userId: string, type: StockControlType): string {
  return `control-draft-${userId}-${type}.json`;
}

/** `new Date('YYYY-MM-DD')` parses as UTC midnight, which is the previous day in Argentina. */
export function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
