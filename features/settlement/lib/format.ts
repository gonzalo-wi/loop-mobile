import type { DifferenceType, SettlementState, StatusGroup } from '../types';

const EMPTY = '—';
const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g;

/**
 * "$ 91.500,00" (pesos argentinos). Armado a mano: el Intl de Hermes en Android no garantiza el
 * formato es-AR en todos los equipos.
 */
export function formatMoney(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return EMPTY;
  const negative = value < 0;
  const [whole, cents] = Math.abs(value).toFixed(2).split('.');
  return `${negative ? '−' : ''}$ ${whole.replace(THOUSANDS, '.')},${cents}`;
}

export const STATUS_LABEL: Record<StatusGroup, string> = {
  PENDING: 'Pendiente',
  READY: 'Listo',
  CLOSED: 'Cerrado',
  NO_DEPOSIT: 'Sin depósito',
};

export const DIFFERENCE_LABEL: Record<DifferenceType, string> = {
  SURPLUS: 'Sobrante',
  SHORTAGE: 'Faltante',
  NONE: 'Sin diferencia',
};

/** Etiqueta del estado; un valor nuevo que todavía no conocemos se muestra tal cual en vez de romper la pantalla. */
export function statusLabel(group: string): string {
  // `in` already proved the key exists; TypeScript does not narrow a plain string from it.
  return group in STATUS_LABEL ? STATUS_LABEL[group as StatusGroup] : group;
}

export function differenceLabel(type: string): string {
  // Same as statusLabel: the `in` check makes the cast safe.
  return type in DIFFERENCE_LABEL ? DIFFERENCE_LABEL[type as DifferenceType] : type;
}

/** Mensaje de cada estado sin números (todos menos AVAILABLE). */
export const STATE_MESSAGE: Record<Exclude<SettlementState, 'AVAILABLE'>, { title: string; hint: string }> = {
  WAITING_ENTRY: {
    title: 'Todavía no volviste',
    hint: 'Vas a ver tu rendición después del control de entrada.',
  },
  NO_ROUTE_NUMBER: {
    title: 'Reparto sin número',
    hint: 'El código de tu reparto no tiene número y no se puede buscar en tesorería. Avisale al administrador.',
  },
  NOT_LOADED: {
    title: 'Tesorería todavía no lo cargó',
    hint: 'Tu reparto todavía no aparece en tesorería. Probá de nuevo en unos minutos.',
  },
  UNAVAILABLE: {
    title: 'Tesorería no responde',
    hint: 'No pudimos consultar tesorería. Probá de nuevo en un rato.',
  },
};
