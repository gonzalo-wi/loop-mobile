import {
  getOdooSubmitGate,
  getOdooUnavailableMessage,
  resolveValidationStatus,
  type SettledValidation,
} from '../odooSubmitGate';
import type { OdooValidationResult } from '../../types';

function result(serie: string, disponible: boolean): OdooValidationResult {
  return { serie, disponible, motivo: null, serie_odoo: null, ubicacion: null };
}

function mapOf(...results: OdooValidationResult[]): Map<string, OdooValidationResult> {
  return new Map(results.map((r) => [r.serie, r]));
}

describe('getOdooSubmitGate', () => {
  it('is ok on UNLOAD whatever Odoo says', () => {
    expect(
      getOdooSubmitGate({
        type: 'UNLOAD',
        codes: ['A'],
        validation: mapOf(result('A', false)),
        status: 'validating',
      }),
    ).toEqual({ kind: 'ok' });
  });

  it('is validating while the answer for the current list is pending', () => {
    expect(
      getOdooSubmitGate({ type: 'LOAD', codes: ['A'], validation: new Map(), status: 'validating' }),
    ).toEqual({ kind: 'validating' });
  });

  it('blocks and lists the unavailable serials once validation is done', () => {
    expect(
      getOdooSubmitGate({
        type: 'LOAD',
        codes: ['A', 'B', 'C'],
        validation: mapOf(result('A', true), result('B', false), result('C', false)),
        status: 'done',
      }),
    ).toEqual({ kind: 'blocked', unavailable: ['B', 'C'] });
  });

  it('is ok when every serial is available', () => {
    expect(
      getOdooSubmitGate({ type: 'LOAD', codes: ['A'], validation: mapOf(result('A', true)), status: 'done' }),
    ).toEqual({ kind: 'ok' });
  });

  it('does not block when the validation failed', () => {
    expect(
      getOdooSubmitGate({ type: 'LOAD', codes: ['A'], validation: new Map(), status: 'failed' }),
    ).toEqual({ kind: 'ok' });
  });

  it('ignores validation results for serials no longer in the list', () => {
    expect(
      getOdooSubmitGate({ type: 'LOAD', codes: ['A'], validation: mapOf(result('B', false)), status: 'done' }),
    ).toEqual({ kind: 'ok' });
  });

  it('blocks as soon as a known unavailable serial is present, even while re-validating', () => {
    expect(
      getOdooSubmitGate({
        type: 'LOAD',
        codes: ['A', 'B'],
        validation: mapOf(result('A', false)),
        status: 'validating',
      }),
    ).toEqual({ kind: 'blocked', unavailable: ['A'] });
  });
});

describe('getOdooSubmitGate scope of codes', () => {
  it('does not block for unavailable serials that are not in the sendable codes (already loaded / not normalized)', () => {
    expect(
      getOdooSubmitGate({
        type: 'LOAD',
        codes: ['A'],
        validation: mapOf(result('A', true), result('LOADED', false), result('NN', false)),
        status: 'done',
      }),
    ).toEqual({ kind: 'ok' });
  });

  it('is ok on UNLOAD even with failed status and unavailable serials', () => {
    expect(
      getOdooSubmitGate({ type: 'UNLOAD', codes: ['A'], validation: mapOf(result('A', false)), status: 'failed' }),
    ).toEqual({ kind: 'ok' });
  });

  it('does not block a serial without an Odoo answer once done', () => {
    expect(
      getOdooSubmitGate({ type: 'LOAD', codes: ['A', 'B'], validation: mapOf(result('A', true)), status: 'done' }),
    ).toEqual({ kind: 'ok' });
  });

  it('still blocks when a later validation failed but an earlier answer marked a serial unavailable', () => {
    expect(
      getOdooSubmitGate({ type: 'LOAD', codes: ['A'], validation: mapOf(result('A', false)), status: 'failed' }),
    ).toEqual({ kind: 'blocked', unavailable: ['A'] });
  });
});

describe('resolveValidationStatus', () => {
  const ok: SettledValidation = { codes: ['A', 'B'], failed: false };
  const failed: SettledValidation = { codes: ['A'], failed: true };

  it('is done for an empty list', () => {
    expect(resolveValidationStatus(null, [])).toBe('done');
  });

  it('is validating when nothing has answered yet', () => {
    expect(resolveValidationStatus(null, ['A'])).toBe('validating');
  });

  it('is done when the answer covers every current serial', () => {
    expect(resolveValidationStatus(ok, ['A'])).toBe('done');
    expect(resolveValidationStatus(ok, ['A', 'B'])).toBe('done');
  });

  it('is validating again when a serial was added after the last answer', () => {
    expect(resolveValidationStatus(ok, ['A', 'B', 'C'])).toBe('validating');
  });

  it('stays done when a serial was removed after the last answer', () => {
    expect(resolveValidationStatus(ok, ['B'])).toBe('done');
  });

  it('is done for an empty list even with a failed answer', () => {
    expect(resolveValidationStatus(failed, [])).toBe('done');
  });

  it('is failed while the failure covers the list, and validating once new serials arrive', () => {
    expect(resolveValidationStatus(failed, ['A'])).toBe('failed');
    expect(resolveValidationStatus(failed, ['A', 'Z'])).toBe('validating');
  });
});

describe('getOdooUnavailableMessage', () => {
  it('uses singular copy for one serial', () => {
    expect(getOdooUnavailableMessage(1)).toBe(
      'Tenés 1 dispenser que no está disponible en Odoo. Eliminalo de la lista para poder enviar.',
    );
  });

  it('uses plural copy for several serials', () => {
    expect(getOdooUnavailableMessage(3)).toBe(
      'Tenés 3 dispensers que no están disponibles en Odoo. Eliminalos de la lista para poder enviar.',
    );
  });
});
