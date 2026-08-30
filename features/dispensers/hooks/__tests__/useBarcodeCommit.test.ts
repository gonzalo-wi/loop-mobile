/**
 * @jest-environment jsdom
 *
 * Tests del código REAL de `useBarcodeCommit` (antes testeado con un
 * "espejo" 1:1 en components/__tests__/barcodeScannerLogic.test.ts, que
 * quedó obsoleto y fue eliminado). El hook usa useState/useRef/useCallback,
 * así que se renderiza con `renderHook` de @testing-library/react.
 *
 * Este archivo corre en jsdom (docblock por-archivo) porque `renderHook`
 * necesita un DOM para montar el componente interno de test. El resto de la
 * suite sigue en `testEnvironment: 'node'` (ver jest.config.js) — no se tocó
 * la config global para no afectar los tests de lógica pura existentes.
 */

import { act, renderHook } from '@testing-library/react';
import {
  useBarcodeCommit,
  type FeedbackKind,
  type UseBarcodeCommitOptions,
} from '../useBarcodeCommit';

function buildOptions(
  overrides: Partial<UseBarcodeCommitOptions> = {},
): UseBarcodeCommitOptions {
  return {
    existingSerials: [],
    onAdd: jest.fn(),
    playFeedbackSound: jest.fn(),
    vibrate: jest.fn(),
    flashFrame: jest.fn(),
    ...overrides,
  };
}

describe('useBarcodeCommit — commitCode', () => {
  it('código nuevo: llama onAdd, vibrate corto, playFeedbackSound("ok"), flashFrame, agrega a recent y feedback "ok"; devuelve true', () => {
    const onAdd = jest.fn();
    const playFeedbackSound = jest.fn();
    const vibrate = jest.fn();
    const flashFrame = jest.fn();

    const { result } = renderHook(() =>
      useBarcodeCommit(
        buildOptions({ onAdd, playFeedbackSound, vibrate, flashFrame }),
      ),
    );

    let added: boolean = false;
    act(() => {
      added = result.current.commitCode('SN-001');
    });

    expect(added).toBe(true);
    expect(onAdd).toHaveBeenCalledWith('SN-001');
    expect(vibrate).toHaveBeenCalledWith(35);
    expect(playFeedbackSound).toHaveBeenCalledWith<[FeedbackKind]>('ok');
    expect(flashFrame).toHaveBeenCalledTimes(1);
    expect(result.current.recent).toEqual([{ code: 'SN-001', invalid: false }]);
    expect(result.current.feedback).toEqual({ type: 'ok', code: 'SN-001' });
  });

  it('código duplicado (en existingSerials): NO llama onAdd ni flashFrame, llama vibrate(70) y playFeedbackSound("dup"), feedback "dup"; devuelve false', () => {
    const onAdd = jest.fn();
    const playFeedbackSound = jest.fn();
    const vibrate = jest.fn();
    const flashFrame = jest.fn();

    const { result } = renderHook(() =>
      useBarcodeCommit(
        buildOptions({
          existingSerials: ['SN-001'],
          onAdd,
          playFeedbackSound,
          vibrate,
          flashFrame,
        }),
      ),
    );

    let added: boolean = true;
    act(() => {
      added = result.current.commitCode('SN-001');
    });

    expect(added).toBe(false);
    expect(onAdd).not.toHaveBeenCalled();
    expect(flashFrame).not.toHaveBeenCalled();
    expect(vibrate).toHaveBeenCalledWith(70);
    expect(playFeedbackSound).toHaveBeenCalledWith<[FeedbackKind]>('dup');
    expect(result.current.feedback).toEqual({ type: 'dup', code: 'SN-001' });
    expect(result.current.recent).toEqual([]);
  });

  it('código inexistente en Aguas (normalizado, en invalidSerials): SÍ llama onAdd, playFeedbackSound("invalid"), feedback "invalid", y lo marca invalid en recent', () => {
    const onAdd = jest.fn();
    const playFeedbackSound = jest.fn();
    const vibrate = jest.fn();
    const flashFrame = jest.fn();

    // normalizeSerial saca espacios y pasa a mayúsculas: 'sn 002' -> 'SN002'
    const { result } = renderHook(() =>
      useBarcodeCommit(
        buildOptions({
          invalidSerials: new Set(['SN002']),
          onAdd,
          playFeedbackSound,
          vibrate,
          flashFrame,
        }),
      ),
    );

    let added: boolean = false;
    act(() => {
      added = result.current.commitCode('sn 002');
    });

    expect(added).toBe(true);
    expect(onAdd).toHaveBeenCalledWith('sn002'); // commitCode solo saca espacios, no mayusculiza el code guardado
    expect(playFeedbackSound).toHaveBeenCalledWith<[FeedbackKind]>('invalid');
    expect(vibrate).toHaveBeenCalledWith([0, 90, 70, 90]);
    expect(flashFrame).toHaveBeenCalledTimes(1);
    expect(result.current.feedback).toEqual({ type: 'invalid', code: 'sn002' });
    expect(result.current.recent).toEqual([{ code: 'sn002', invalid: true }]);
  });

  it('código vacío o solo espacios: no hace nada y devuelve false', () => {
    const onAdd = jest.fn();
    const playFeedbackSound = jest.fn();
    const vibrate = jest.fn();
    const flashFrame = jest.fn();

    const { result } = renderHook(() =>
      useBarcodeCommit(
        buildOptions({ onAdd, playFeedbackSound, vibrate, flashFrame }),
      ),
    );

    let added: boolean = true;
    act(() => {
      added = result.current.commitCode('   ');
    });

    expect(added).toBe(false);
    expect(onAdd).not.toHaveBeenCalled();
    expect(vibrate).not.toHaveBeenCalled();
    expect(playFeedbackSound).not.toHaveBeenCalled();
    expect(flashFrame).not.toHaveBeenCalled();
    expect(result.current.feedback).toBeNull();
  });

  // NOTA DE CONTRATO: el hook envuelve las deps de feedback (playFeedbackSound/
  // vibrate/flashFrame) con un helper interno `safeCall` (try/catch mudo), así
  // que el hook ES a-prueba-de-throws de esas dependencias inyectadas — no
  // depende de que el componente que lo usa las proteja. Un fallo en
  // sonido/vibración/flash nunca debe cortar `commitCode`: `onAdd` se sigue
  // llamando, `recent`/`feedback` se siguen actualizando y devuelve true.
  it('si playFeedbackSound lanza, el hook la protege: commitCode de un código OK igual llama onAdd, setea feedback "ok", agrega a recent y devuelve true', () => {
    const onAdd = jest.fn();
    const vibrate = jest.fn();
    const flashFrame = jest.fn();
    const playFeedbackSound = jest.fn(() => {
      throw new Error('boom: audio device busy');
    });

    const { result } = renderHook(() =>
      useBarcodeCommit(
        buildOptions({ onAdd, playFeedbackSound, vibrate, flashFrame }),
      ),
    );

    let added: boolean = false;
    expect(() => {
      act(() => {
        added = result.current.commitCode('SN-001');
      });
    }).not.toThrow();

    expect(added).toBe(true);
    expect(onAdd).toHaveBeenCalledWith('SN-001');
    expect(result.current.feedback).toEqual({ type: 'ok', code: 'SN-001' });
    expect(result.current.recent).toEqual([{ code: 'SN-001', invalid: false }]);
  });

  it('si vibrate lanza, el hook la protege: onAdd igual se llama', () => {
    const onAdd = jest.fn();
    const playFeedbackSound = jest.fn();
    const flashFrame = jest.fn();
    const vibrate = jest.fn(() => {
      throw new Error('boom: vibration API unavailable');
    });

    const { result } = renderHook(() =>
      useBarcodeCommit(
        buildOptions({ onAdd, playFeedbackSound, vibrate, flashFrame }),
      ),
    );

    expect(() => {
      act(() => {
        result.current.commitCode('SN-001');
      });
    }).not.toThrow();

    expect(onAdd).toHaveBeenCalledWith('SN-001');
  });

  it('si flashFrame lanza, el hook la protege: onAdd igual se llama', () => {
    const onAdd = jest.fn();
    const playFeedbackSound = jest.fn();
    const vibrate = jest.fn();
    const flashFrame = jest.fn(() => {
      throw new Error('boom: animation driver error');
    });

    const { result } = renderHook(() =>
      useBarcodeCommit(
        buildOptions({ onAdd, playFeedbackSound, vibrate, flashFrame }),
      ),
    );

    expect(() => {
      act(() => {
        result.current.commitCode('SN-001');
      });
    }).not.toThrow();

    expect(onAdd).toHaveBeenCalledWith('SN-001');
  });
});

describe('useBarcodeCommit — handleScan', () => {
  it('código con espacios internos escaneado 2 veces seguidas (<cooldown) agrega una sola vez (dedupe sobre valor normalizado)', () => {
    const onAdd = jest.fn();

    const { result } = renderHook(() =>
      useBarcodeCommit(buildOptions({ onAdd, cooldownMs: 2000 })),
    );

    act(() => {
      result.current.handleScan('SN 001 234');
    });
    act(() => {
      result.current.handleScan('SN001234'); // mismo código normalizado, llamado enseguida
    });

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith('SN001234');
  });

  it('pasado el cooldown, el mismo código normalizado se vuelve a procesar', () => {
    jest.useFakeTimers();
    try {
      const onAdd = jest.fn();

      const { result } = renderHook(() =>
        useBarcodeCommit(buildOptions({ onAdd, cooldownMs: 2000 })),
      );

      act(() => {
        result.current.handleScan('SN 001');
      });
      act(() => {
        jest.advanceTimersByTime(2001);
      });
      act(() => {
        result.current.handleScan('SN 001');
      });

      expect(onAdd).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('data undefined o vacío ("") no hace nada (no llama onAdd ni deps)', () => {
    const onAdd = jest.fn();
    const playFeedbackSound = jest.fn();
    const vibrate = jest.fn();
    const flashFrame = jest.fn();

    const { result } = renderHook(() =>
      useBarcodeCommit(
        buildOptions({ onAdd, playFeedbackSound, vibrate, flashFrame }),
      ),
    );

    act(() => {
      result.current.handleScan(undefined);
    });
    act(() => {
      result.current.handleScan('');
    });
    act(() => {
      result.current.handleScan('   ');
    });

    expect(onAdd).not.toHaveBeenCalled();
    expect(playFeedbackSound).not.toHaveBeenCalled();
    expect(vibrate).not.toHaveBeenCalled();
    expect(flashFrame).not.toHaveBeenCalled();
  });
});

describe('useBarcodeCommit — reset', () => {
  it('limpia feedback y recent', () => {
    const { result } = renderHook(() => useBarcodeCommit(buildOptions()));

    act(() => {
      result.current.commitCode('SN-001');
    });

    expect(result.current.feedback).not.toBeNull();
    expect(result.current.recent).toHaveLength(1);

    act(() => {
      result.current.reset();
    });

    expect(result.current.feedback).toBeNull();
    expect(result.current.recent).toEqual([]);
  });
});

describe('useBarcodeCommit — existingSerials como prop reactiva', () => {
  it('un código que se vuelve duplicado tras un rerender con existingSerials actualizado deja de poder agregarse', () => {
    const onAdd = jest.fn();

    const { result, rerender } = renderHook(
      (props: UseBarcodeCommitOptions) => useBarcodeCommit(props),
      { initialProps: buildOptions({ onAdd, existingSerials: [] }) },
    );

    let added: boolean = false;
    act(() => {
      added = result.current.commitCode('SN-001');
    });
    expect(added).toBe(true);
    expect(onAdd).toHaveBeenCalledTimes(1);

    rerender(buildOptions({ onAdd, existingSerials: ['SN-001'] }));

    act(() => {
      added = result.current.commitCode('SN-001');
    });
    expect(added).toBe(false);
    expect(onAdd).toHaveBeenCalledTimes(1); // no se sumó una segunda vez
  });
});
