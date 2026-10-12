import { getSystemStatusBlocks } from '../systemStatusBlocks';
import type { DispenserMovement } from '../../types';

function buildMovement(overrides: Partial<DispenserMovement> = {}): DispenserMovement {
  return {
    id: 'mov-1',
    type: 'LOAD',
    routeCode: '186',
    technician: 'Juan Perez',
    locationId: 2,
    stateId: 2,
    movementDate: '2026-09-08',
    status: 'SENT_TO_AGUAS',
    serials: ['SN-1', 'SN-2'],
    excludedSerials: [],
    aguasMovementId: null,
    registeredBy: 'user-1',
    registeredByUsername: 'jperez',
    createdAt: '2026-09-08T10:00:00Z',
    updatedAt: '2026-09-08T10:00:00Z',
    odooStatus: 'SENT',
    odooPickingName: 'AC/INT/00161',
    odooPickingId: 161,
    odooReference: null,
    ...overrides,
  };
}

describe('getSystemStatusBlocks', () => {
  it('shows Aguas and Odoo for a load, with the Odoo voucher as detail', () => {
    expect(getSystemStatusBlocks(buildMovement())).toEqual([
      { system: 'aguas', tag: 'AGUAS', title: 'Enviado', detail: null, tone: 'ok' },
      { system: 'odoo', tag: 'ODOO', title: 'OK', detail: 'Comprobante: AC/INT/00161', tone: 'ok' },
    ]);
  });

  it('keeps the long Aguas label as detail for every status', () => {
    const aguas = (status: DispenserMovement['status']) =>
      getSystemStatusBlocks(buildMovement({ type: 'UNLOAD', status }))[0];
    expect(aguas('REGISTERED')).toMatchObject({ title: 'Enviando…', detail: 'Registrado · enviando a Aguas', tone: 'pending' });
    expect(aguas('AGUAS_ERROR')).toMatchObject({ title: 'Error', detail: 'Error — reintentando', tone: 'error' });
    expect(aguas('SKIPPED_UNREGISTERED')).toMatchObject({
      title: 'No enviado',
      detail: 'No enviado a Aguas · todos excluidos',
      tone: 'pending',
    });
    expect(aguas('CANCELLED')).toMatchObject({ title: 'Cancelado', detail: null, tone: 'neutral' });
  });

  it('uses the Odoo long label when there is no voucher yet or it was rejected', () => {
    expect(getSystemStatusBlocks(buildMovement({ odooStatus: null, odooPickingName: null }))[1]).toMatchObject({
      title: 'Enviando…',
      detail: 'Enviando a Odoo…',
      tone: 'pending',
    });
    expect(getSystemStatusBlocks(buildMovement({ odooStatus: 'ERROR' }))[1]).toMatchObject({
      title: 'Rechazado',
      detail: 'Odoo rechazó la carga',
      tone: 'error',
    });
  });

  it('adds the non-normalized Odoo intake for an unload with excluded serials', () => {
    const blocks = getSystemStatusBlocks(
      buildMovement({
        type: 'UNLOAD',
        excludedSerials: ['SN-2'],
        odooNoNormalizadoStatus: 'SENT',
        odooNoNormalizadoPickingName: 'NN/0001',
      }),
    );
    expect(blocks).toHaveLength(2);
    expect(blocks[1]).toEqual({
      system: 'odoo',
      tag: 'ODOO · NO NORMALIZADOS',
      title: 'OK',
      detail: 'Comprobante: NN/0001',
      tone: 'ok',
    });
  });

  it('shows only Aguas for an unload without excluded serials', () => {
    expect(getSystemStatusBlocks(buildMovement({ type: 'UNLOAD' }))).toHaveLength(1);
  });
  it('falls back to the sent label when Odoo accepted the load but returned no voucher', () => {
    expect(getSystemStatusBlocks(buildMovement({ odooPickingName: null }))[1]).toMatchObject({
      title: 'OK',
      detail: 'Registrado en Odoo',
      tone: 'ok',
    });
  });

  it('treats an unknown Aguas status like REGISTERED', () => {
    const unknown = 'WHATEVER' as DispenserMovement['status'];
    expect(getSystemStatusBlocks(buildMovement({ type: 'UNLOAD', status: unknown }))[0]).toMatchObject({
      title: 'Enviando…',
      detail: 'Registrado · enviando a Aguas',
      tone: 'pending',
    });
  });

  describe('non-normalized intake status', () => {
    const unload = (overrides: Partial<DispenserMovement> = {}) =>
      getSystemStatusBlocks(buildMovement({ type: 'UNLOAD', excludedSerials: ['SN-2'], ...overrides }))[1];

    it('is still sending when the status is undefined or null', () => {
      const expected = {
        tag: 'ODOO · NO NORMALIZADOS',
        title: 'Enviando…',
        detail: 'Derivando no normalizados a Odoo…',
        tone: 'pending',
      };
      expect(unload({ odooNoNormalizadoStatus: undefined })).toMatchObject(expected);
      expect(unload({ odooNoNormalizadoStatus: null })).toMatchObject(expected);
    });

    it('reports a rejection with its own label', () => {
      expect(unload({ odooNoNormalizadoStatus: 'ERROR' })).toMatchObject({
        title: 'Rechazado',
        detail: 'Odoo rechazó los no normalizados · reintentando',
        tone: 'error',
      });
    });

    it('uses the sent label when accepted without voucher', () => {
      expect(unload({ odooNoNormalizadoStatus: 'SENT', odooNoNormalizadoPickingName: null })).toMatchObject({
        title: 'OK',
        detail: 'No normalizados en Odoo',
        tone: 'ok',
      });
    });

    it('is absent for a cancelled unload with excluded serials', () => {
      const blocks = getSystemStatusBlocks(
        buildMovement({ type: 'UNLOAD', status: 'CANCELLED', excludedSerials: ['SN-2'] }),
      );
      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toMatchObject({ title: 'Cancelado', tone: 'neutral' });
    });

    it('keeps both the Aguas and non-normalized blocks when every serial is excluded', () => {
      const blocks = getSystemStatusBlocks(
        buildMovement({ type: 'UNLOAD', status: 'SKIPPED_UNREGISTERED', excludedSerials: ['SN-1', 'SN-2'] }),
      );
      expect(blocks.map((b) => b.tag)).toEqual(['AGUAS', 'ODOO · NO NORMALIZADOS']);
    });

    it('is not added to a load, even with excluded serials', () => {
      const blocks = getSystemStatusBlocks(buildMovement({ excludedSerials: ['SN-2'] }));
      expect(blocks.map((b) => b.tag)).toEqual(['AGUAS', 'ODOO']);
    });

    it('tolerates old responses without excludedSerials', () => {
      const mov = buildMovement({ type: 'UNLOAD' });
      delete (mov as Partial<DispenserMovement>).excludedSerials;
      expect(getSystemStatusBlocks(mov)).toHaveLength(1);
    });
  });
});
