import { getUnregisteredSerials, normalizeSerial, sanitizeSerial } from '../dispenserValidationApi';

/**
 * `getUnregisteredSerials` pega directo a Aguas con `fetch` global (no pasa
 * por el wrapper `@/lib/api`), así que acá mockeamos `fetch` en vez de
 * `@/lib/api` como en `odooApi.test.ts`.
 *
 * Se agrega cobertura para esta pieza porque es la que usa
 * `refreshInvalidSerials()` en `app/dispensers.tsx` (llamada tanto en el
 * `useFocusEffect` de foco como en el pull-to-refresh nuevo): si esto
 * devuelve mal el Set normalizado, el gate de seriales inválidos de toda
 * la pantalla queda roto.
 */

const mockFetch = jest.fn();

beforeEach(() => {
  (global as unknown as { fetch: jest.Mock }).fetch = mockFetch;
});

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

describe('normalizeSerial', () => {
  it('saca espacios (puntas e internos) y pasa a mayúsculas', () => {
    expect(normalizeSerial('  sn 001 234 ')).toBe('SN001234');
  });

  it('cadena vacía devuelve cadena vacía', () => {
    expect(normalizeSerial('')).toBe('');
  });
});

describe('sanitizeSerial', () => {
  it('saca los caracteres < y >', () => {
    expect(sanitizeSerial('<ABC123>')).toBe('ABC123');
  });

  it('conserva los guiones', () => {
    expect(sanitizeSerial('SN-001')).toBe('SN-001');
  });

  it('mantiene el case (no mayusculiza ni minusculiza)', () => {
    expect(sanitizeSerial('sn-Abc')).toBe('sn-Abc');
  });

  it('saca espacios internos y de las puntas', () => {
    expect(sanitizeSerial('  SN 001 ')).toBe('SN001');
  });

  it('un string de solo caracteres inválidos da cadena vacía', () => {
    expect(sanitizeSerial('<<< >>>')).toBe('');
  });

  it('saca guiones bajos y barras, pero conserva puntos y asteriscos (charset permitido)', () => {
    // charset permitido: [A-Za-z0-9.*-]; '_' y '/' no están incluidos y se descartan,
    // '.' y '*' sí forman parte del charset y se conservan
    expect(sanitizeSerial('SN_001.2/3')).toBe('SN001.23');
  });

  it('conserva los asteriscos', () => {
    expect(sanitizeSerial('SN*001')).toBe('SN*001');
  });

  it('con options.uppercase: true pasa el resultado a mayúsculas', () => {
    expect(sanitizeSerial('sn-abc.1*2', { uppercase: true })).toBe('SN-ABC.1*2');
  });

  it('sin options (default) mantiene el case, igual que antes', () => {
    expect(sanitizeSerial('sn-Abc')).toBe('sn-Abc');
  });

  it('cadena vacía devuelve cadena vacía', () => {
    expect(sanitizeSerial('')).toBe('');
  });

  it('conserva punto y asterisco juntos en el mismo serial', () => {
    expect(sanitizeSerial('SN.123*A')).toBe('SN.123*A');
  });

  it('saca < > _ / y espacios mezclados, conservando los puntos y asteriscos presentes', () => {
    expect(sanitizeSerial('<SN_123.4*5/6 7>')).toBe('SN123.4*567');
  });

  it('con options.uppercase: true mayusculiza y de paso sigue conservando punto y asterisco', () => {
    expect(sanitizeSerial('sn.123*a', { uppercase: true })).toBe('SN.123*A');
  });

  it('con options.uppercase: false se comporta igual que el default (preserva case)', () => {
    expect(sanitizeSerial('sn-Abc', { uppercase: false })).toBe('sn-Abc');
  });
});

describe('getUnregisteredSerials', () => {
  it('llama a la URL de Aguas correcta con la fecha dada', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true, listado: [] }));

    await getUnregisteredSerials('2026-09-12');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe(
      'http://35.199.104.218:8080/jmobile/service/dispenserope/getDispenserNoRegistrado=fecha=2026-09-12',
    );
    expect(calledOptions).toEqual({ signal: expect.any(AbortSignal) });
  });

  it('devuelve un Set normalizado (sin espacios, mayúsculas) a partir de `listado`', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        listado: [{ nroSerie: 'sn 001' }, { nroSerie: 'SN-002' }],
      }),
    );

    const result = await getUnregisteredSerials('2026-09-12');

    expect(result).toEqual(new Set(['SN001', 'SN-002']));
  });

  it('si `listado` viene undefined, devuelve un Set vacío', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }));

    const result = await getUnregisteredSerials('2026-09-12');

    expect(result).toEqual(new Set());
  });

  it('descarta entradas con `nroSerie` vacío o ausente', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        success: true,
        listado: [{ nroSerie: '' }, { nroSerie: 'SN-003' }, {}],
      }),
    );

    const result = await getUnregisteredSerials('2026-09-12');

    expect(result).toEqual(new Set(['SN-003']));
  });

  it('si la respuesta HTTP no es ok, lanza con el status', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, false, 503));

    await expect(getUnregisteredSerials('2026-09-12')).rejects.toThrow('Aguas respondió 503');
  });

  it('propaga el error si `fetch` rechaza (sin conexión con Aguas)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network request failed'));

    await expect(getUnregisteredSerials('2026-09-12')).rejects.toThrow('Network request failed');
  });
});
