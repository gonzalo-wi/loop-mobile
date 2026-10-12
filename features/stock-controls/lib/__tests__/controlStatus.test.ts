import { getControlStatus } from '../controlStatus';

describe('getControlStatus', () => {
  it('keeps the current labels and maps each status to a LOOP tone', () => {
    expect(getControlStatus('CONTROLLED')).toEqual({ label: 'Controlado', tone: 'info' });
    expect(getControlStatus('PENDING_DRIVER_APPROVAL')).toEqual({ label: 'Pendiente', tone: 'pending' });
    expect(getControlStatus('ACCEPTED_BY_DRIVER')).toEqual({ label: 'Aprobado', tone: 'ok' });
    expect(getControlStatus('REJECTED_BY_DRIVER')).toEqual({ label: 'Rechazado', tone: 'error' });
    expect(getControlStatus('WITH_DIFFERENCES')).toEqual({ label: 'Con diferencias', tone: 'pending' });
    expect(getControlStatus('SENT_TO_AGUAS')).toEqual({ label: 'Enviado a Aguas', tone: 'ok' });
    expect(getControlStatus('AGUAS_ERROR')).toEqual({ label: 'Error Aguas', tone: 'error' });
    expect(getControlStatus('CANCELLED')).toEqual({ label: 'Cancelado', tone: 'neutral' });
  });

  it('shows an unknown status as-is in neutral', () => {
    expect(getControlStatus('SOMETHING_NEW')).toEqual({ label: 'SOMETHING_NEW', tone: 'neutral' });
  });

  // Labels of the removed STATUS_LABELS map in app/(tabs)/history.tsx
  it.each([
    ['CONTROLLED', 'Controlado'],
    ['PENDING_DRIVER_APPROVAL', 'Pendiente'],
    ['ACCEPTED_BY_DRIVER', 'Aprobado'],
    ['REJECTED_BY_DRIVER', 'Rechazado'],
    ['WITH_DIFFERENCES', 'Con diferencias'],
    ['SENT_TO_AGUAS', 'Enviado a Aguas'],
    ['AGUAS_ERROR', 'Error Aguas'],
    ['CANCELLED', 'Cancelado'],
  ])('keeps the legacy label for %s', (status, label) => {
    expect(getControlStatus(status).label).toBe(label);
  });

  it('keeps the legacy color grouping (amber, red, gray) in the tones', () => {
    expect(getControlStatus('PENDING_DRIVER_APPROVAL').tone).toBe(getControlStatus('WITH_DIFFERENCES').tone);
    expect(getControlStatus('REJECTED_BY_DRIVER').tone).toBe(getControlStatus('AGUAS_ERROR').tone);
    expect(getControlStatus('CANCELLED').tone).toBe('neutral');
  });

  it('treats an empty string and a wrong-case status as unknown', () => {
    expect(getControlStatus('')).toEqual({ label: '', tone: 'neutral' });
    expect(getControlStatus('controlled')).toEqual({ label: 'controlled', tone: 'neutral' });
  });

  it('does not resolve Object.prototype keys as statuses', () => {
    expect(getControlStatus('toString')).toEqual({ label: 'toString', tone: 'neutral' });
    expect(getControlStatus('constructor')).toEqual({ label: 'constructor', tone: 'neutral' });
  });
});
