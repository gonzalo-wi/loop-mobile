import { getFrameRect, getResultCenter, isWithinFrame, SCAN_FRAME_TOLERANCE } from '../scanRegion';
import type { ScanGeometry } from '../scanRegion';

describe('getFrameRect', () => {
  it('centra el rect en la cámara y lo expande por la tolerancia (12%) sobre el ancho/alto del frame', () => {
    // cámara 400x800, frame 264x172, tolerance 0.12
    // expandedWidth = 264 * 1.12 = 295.68, expandedHeight = 172 * 1.12 = 192.64
    // x = 400/2 - 295.68/2 = 52.16, y = 800/2 - 192.64/2 = 303.68
    const rect = getFrameRect(400, 800, 264, 172, SCAN_FRAME_TOLERANCE);

    expect(rect.width).toBeCloseTo(295.68, 5);
    expect(rect.height).toBeCloseTo(192.64, 5);
    expect(rect.x).toBeCloseTo(52.16, 5);
    expect(rect.y).toBeCloseTo(303.68, 5);
  });

  it('con tolerance 0 el rect es exacto (sin margen), centrado en la cámara', () => {
    // x = 400/2 - 264/2 = 68, y = 800/2 - 172/2 = 314
    const rect = getFrameRect(400, 800, 264, 172, 0);

    expect(rect).toEqual({ x: 68, y: 314, width: 264, height: 172 });
  });

  it('usa SCAN_FRAME_TOLERANCE (0.12) como default cuando no se pasa tolerance', () => {
    const withDefault = getFrameRect(400, 800, 264, 172);
    const withExplicit = getFrameRect(400, 800, 264, 172, 0.12);

    expect(withDefault).toEqual(withExplicit);
  });
});

describe('getResultCenter', () => {
  it('con cornerPoints válidos: devuelve el promedio de los puntos', () => {
    const result: ScanGeometry = {
      cornerPoints: [
        { x: 100, y: 200 },
        { x: 200, y: 200 },
        { x: 200, y: 300 },
        { x: 100, y: 300 },
      ],
    };

    expect(getResultCenter(result)).toEqual({ x: 150, y: 250 });
  });

  it('sin cornerPoints pero con bounds: devuelve origin + size/2', () => {
    const result: ScanGeometry = {
      bounds: { origin: { x: 50, y: 60 }, size: { width: 40, height: 20 } },
    };

    expect(getResultCenter(result)).toEqual({ x: 70, y: 70 });
  });

  it('cornerPoints con valores no finitos se ignoran y cae a bounds', () => {
    const result: ScanGeometry = {
      cornerPoints: [
        { x: NaN, y: 200 },
        { x: 200, y: undefined as unknown as number },
      ],
      bounds: { origin: { x: 10, y: 10 }, size: { width: 100, height: 50 } },
    };

    expect(getResultCenter(result)).toEqual({ x: 60, y: 35 });
  });

  it('cornerPoints inválidos y sin bounds usable: devuelve null', () => {
    const result: ScanGeometry = {
      cornerPoints: [{ x: NaN, y: NaN }],
    };

    expect(getResultCenter(result)).toBeNull();
  });

  it('sin geometría (bounds.size {0,0} y cornerPoints vacío): devuelve null', () => {
    const result: ScanGeometry = {
      cornerPoints: [],
      bounds: { origin: { x: 0, y: 0 }, size: { width: 0, height: 0 } },
    };

    expect(getResultCenter(result)).toBeNull();
  });

  it('sin bounds ni cornerPoints (todo undefined): devuelve null', () => {
    expect(getResultCenter({})).toBeNull();
  });
});

describe('isWithinFrame', () => {
  const rect = getFrameRect(400, 800, 264, 172, SCAN_FRAME_TOLERANCE);
  // rect ≈ { x: 52.16, y: 303.68, width: 295.68, height: 192.64 }
  // rect sin tolerancia (base): { x: 68, y: 314, width: 264, height: 172 } → borde derecho x=332

  it('centro claramente dentro del rect: true', () => {
    const result: ScanGeometry = { bounds: { origin: { x: 190, y: 390 }, size: { width: 20, height: 20 } } };
    // centro: (200, 400), bien dentro del rect
    expect(isWithinFrame(result, rect)).toBe(true);
  });

  it('centro claramente fuera del rect: false', () => {
    const result: ScanGeometry = { bounds: { origin: { x: 0, y: 0 }, size: { width: 2, height: 2 } } };
    // centro: (1, 1), lejos del rect
    expect(isWithinFrame(result, rect)).toBe(false);
  });

  it('centro justo en el borde del rect: true (inclusive)', () => {
    const result: ScanGeometry = {
      cornerPoints: [{ x: rect.x, y: rect.y }],
    };
    expect(isWithinFrame(result, rect)).toBe(true);
  });

  it('centro fuera del recuadro base pero dentro del margen de tolerancia: true', () => {
    const baseRect = getFrameRect(400, 800, 264, 172, 0); // borde derecho en x=332
    const result: ScanGeometry = { cornerPoints: [{ x: 337, y: 400 }] };

    // fuera del rect base (332 < 337)...
    expect(isWithinFrame(result, baseRect)).toBe(false);
    // ...pero dentro del rect con margen de tolerancia (347.84 > 337)
    expect(isWithinFrame(result, rect)).toBe(true);
  });

  it('sin geometría usable (getResultCenter null): fallback true', () => {
    const result: ScanGeometry = { cornerPoints: [], bounds: { origin: { x: 0, y: 0 }, size: { width: 0, height: 0 } } };

    expect(isWithinFrame(result, rect)).toBe(true);
  });
});
