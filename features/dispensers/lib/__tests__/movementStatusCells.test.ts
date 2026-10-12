import { getMovementStatusCells } from '../movementStatusCells';
import type { DispenserMovement } from '../../types';

type Input = Pick<DispenserMovement, 'type' | 'status' | 'odooStatus'>;

function mov(overrides: Partial<Input> = {}): Input {
  return { type: 'LOAD', status: 'SENT_TO_AGUAS', odooStatus: 'SENT', ...overrides };
}

describe('getMovementStatusCells', () => {
  it('shows Aguas and Odoo for a load sent to both', () => {
    expect(getMovementStatusCells(mov())).toEqual([
      { system: 'Aguas', status: 'Enviado', tone: 'ok' },
      { system: 'Odoo', status: 'OK', tone: 'ok' },
    ]);
  });

  it('maps every Aguas status keeping the current labels', () => {
    const aguas = (status: Input['status']) => getMovementStatusCells(mov({ type: 'UNLOAD', status }))[0];
    expect(aguas('REGISTERED')).toEqual({ system: 'Aguas', status: 'Enviando…', tone: 'pending' });
    expect(aguas('SENT_TO_AGUAS')).toEqual({ system: 'Aguas', status: 'Enviado', tone: 'ok' });
    expect(aguas('AGUAS_ERROR')).toEqual({ system: 'Aguas', status: 'Error', tone: 'error' });
    expect(aguas('SKIPPED_UNREGISTERED')).toEqual({ system: 'Aguas', status: 'No enviado', tone: 'pending' });
    expect(aguas('CANCELLED')).toEqual({ system: 'Aguas', status: 'Cancelado', tone: 'neutral' });
  });

  it('maps the Odoo status of a load; no answer yet means sending', () => {
    const odoo = (odooStatus: Input['odooStatus']) => getMovementStatusCells(mov({ odooStatus }))[1];
    expect(odoo(null)).toEqual({ system: 'Odoo', status: 'Enviando…', tone: 'pending' });
    expect(odoo('ERROR')).toEqual({ system: 'Odoo', status: 'Rechazado', tone: 'error' });
  });

  it('has no Odoo cell when nothing goes to Odoo', () => {
    expect(getMovementStatusCells(mov({ type: 'UNLOAD' }))).toHaveLength(1);
    expect(getMovementStatusCells(mov({ status: 'SKIPPED_UNREGISTERED' }))).toHaveLength(1);
    expect(getMovementStatusCells(mov({ status: 'CANCELLED' }))).toHaveLength(1);
  });
  it('treats an unknown Aguas status like REGISTERED', () => {
    const unknown = 'WHATEVER' as Input['status'];
    expect(getMovementStatusCells(mov({ type: 'UNLOAD', status: unknown }))[0]).toEqual({
      system: 'Aguas',
      status: 'Enviando…',
      tone: 'pending',
    });
  });

  it('treats an undefined Odoo status like no answer yet', () => {
    const cells = getMovementStatusCells(mov({ odooStatus: undefined as unknown as Input['odooStatus'] }));
    expect(cells[1]).toEqual({ system: 'Odoo', status: 'Enviando…', tone: 'pending' });
  });

  it('keeps the Odoo cell for a load still registered or with an Aguas error', () => {
    expect(getMovementStatusCells(mov({ status: 'REGISTERED', odooStatus: null }))).toHaveLength(2);
    expect(getMovementStatusCells(mov({ status: 'AGUAS_ERROR', odooStatus: 'ERROR' }))[1].tone).toBe('error');
  });
});
