import { getSerialRowStatus } from '../serialRowStatus';
import type { OdooValidationResult } from '../../types';

function odoo(overrides: Partial<OdooValidationResult> = {}): OdooValidationResult {
  return {
    serie: 'SN-1',
    disponible: true,
    motivo: null,
    serie_odoo: null,
    ubicacion: null,
    ...overrides,
  };
}

describe('getSerialRowStatus', () => {
  it('rejects a serial that already went out in an earlier load, over the Odoo warning', () => {
    expect(
      getSerialRowStatus({
        type: 'LOAD',
        valid: true,
        alreadyLoaded: true,
        odoo: odoo({ disponible: false, motivo: 'Está en el reparto' }),
      }),
    ).toEqual({ tone: 'error', message: 'Ya salió en otra carga de este reparto · no se envía', detail: null });
  });

  it('is ok with no message for a valid serial without Odoo issues', () => {
    expect(getSerialRowStatus({ type: 'LOAD', valid: true, odoo: odoo() })).toEqual({
      tone: 'ok',
      message: null,
      detail: null,
    });
    expect(getSerialRowStatus({ type: 'UNLOAD', valid: true })).toEqual({
      tone: 'ok',
      message: null,
      detail: null,
    });
  });

  it('rejects a non-normalized serial on LOAD because it is not sent', () => {
    expect(getSerialRowStatus({ type: 'LOAD', valid: false })).toEqual({
      tone: 'error',
      message: 'No normalizado (jMobile) · no se envía',
      detail: null,
    });
  });

  it('warns about a non-normalized serial on UNLOAD because it goes to Odoo', () => {
    expect(getSerialRowStatus({ type: 'UNLOAD', valid: false })).toEqual({
      tone: 'warning',
      message: 'No normalizado · va a Odoo (no normalizados)',
      detail: null,
    });
  });

  it('warns about a serial Odoo reports as unavailable, with the full reason on its own line', () => {
    expect(
      getSerialRowStatus({
        type: 'LOAD',
        valid: true,
        odoo: odoo({ disponible: false, motivo: 'El equipo está en PLANTA BAJA / REPARACION' }),
      }),
    ).toEqual({
      tone: 'warning',
      message: 'Odoo: no disponible',
      detail: 'El equipo está en PLANTA BAJA / REPARACION',
    });
  });

  it('omits the detail when Odoo gives no reason', () => {
    expect(
      getSerialRowStatus({ type: 'LOAD', valid: true, odoo: odoo({ disponible: false }) }).detail,
    ).toBeNull();
  });

  it('omits the detail when the Odoo reason is an empty string', () => {
    expect(
      getSerialRowStatus({ type: 'LOAD', valid: true, odoo: odoo({ disponible: false, motivo: '' }) }),
    ).toEqual({ tone: 'warning', message: 'Odoo: no disponible', detail: null });
  });

  it('is ok on LOAD when Odoo has not answered yet for the serial', () => {
    expect(getSerialRowStatus({ type: 'LOAD', valid: true, odoo: undefined }).tone).toBe('ok');
  });

  it('keeps the non-normalized warning on UNLOAD even if Odoo data is present', () => {
    expect(
      getSerialRowStatus({ type: 'UNLOAD', valid: false, odoo: odoo({ disponible: false, motivo: 'x' }) }),
    ).toEqual({
      tone: 'warning',
      message: 'No normalizado · va a Odoo (no normalizados)',
      detail: null,
    });
  });

  it('gives the non-normalized rejection priority over the Odoo warning', () => {
    expect(
      getSerialRowStatus({ type: 'LOAD', valid: false, odoo: odoo({ disponible: false, motivo: 'x' }) })
        .tone,
    ).toBe('error');
  });

  it('ignores Odoo validation on UNLOAD, where it is not checked', () => {
    expect(
      getSerialRowStatus({ type: 'UNLOAD', valid: true, odoo: odoo({ disponible: false, motivo: 'x' }) })
        .tone,
    ).toBe('ok');
  });
});
