export type ControlStatusTone = 'info' | 'pending' | 'ok' | 'error' | 'neutral';

const STATUS: Record<string, { label: string; tone: ControlStatusTone }> = {
  CONTROLLED: { label: 'Controlado', tone: 'info' },
  PENDING_DRIVER_APPROVAL: { label: 'Pendiente', tone: 'pending' },
  ACCEPTED_BY_DRIVER: { label: 'Aprobado', tone: 'ok' },
  REJECTED_BY_DRIVER: { label: 'Rechazado', tone: 'error' },
  WITH_DIFFERENCES: { label: 'Con diferencias', tone: 'pending' },
  SENT_TO_AGUAS: { label: 'Enviado a Aguas', tone: 'ok' },
  AGUAS_ERROR: { label: 'Error Aguas', tone: 'error' },
  CANCELLED: { label: 'Cancelado', tone: 'neutral' },
};

/** Label and color tone of a stock control status; unknown statuses show their raw value. */
export function getControlStatus(status: string): { label: string; tone: ControlStatusTone } {
  // hasOwn: keys like "toString" must not resolve through the prototype.
  return Object.prototype.hasOwnProperty.call(STATUS, status) ? STATUS[status] : { label: status, tone: 'neutral' };
}
