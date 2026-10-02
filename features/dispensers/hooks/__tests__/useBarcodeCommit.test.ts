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

  it('código no normalizado en jMobile (en invalidSerials): SÍ llama onAdd, playFeedbackSound("invalid"), feedback "invalid", y lo marca invalid en recent', () => {
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

  it('código con < > y otros caracteres inválidos: sanea antes de comitear, onAdd recibe el valor SANEADO', () => {
    const onAdd = jest.fn();

    const { result } = renderHook(() => useBarcodeCommit(buildOptions({ onAdd })));

    let added: boolean = false;
    act(() => {
      added = result.current.commitCode('<SN-005>');
    });

    expect(added).toBe(true);
    expect(onAdd).toHaveBeenCalledWith('SN-005');
    expect(result.current.recent).toEqual([{ code: 'SN-005', invalid: false }]);
  });

  it('código que queda vacío tras sanear (solo caracteres inválidos): no llama onAdd ni feedback, devuelve false', () => {
    const onAdd = jest.fn();
    const playFeedbackSound = jest.fn();
    const vibrate = jest.fn();
    const flashFrame = jest.fn();

    const { result } = renderHook(() =>
      useBarcodeCommit(buildOptions({ onAdd, playFeedbackSound, vibrate, flashFrame })),
    );

    let added: boolean = true;
    act(() => {
      added = result.current.commitCode('<>');
    });

    expect(added).toBe(false);
    expect(onAdd).not.toHaveBeenCalled();
    expect(vibrate).not.toHaveBeenCalled();
    expect(playFeedbackSound).not.toHaveBeenCalled();
    expect(flashFrame).not.toHaveBeenCalled();
    expect(result.current.feedback).toBeNull();
    expect(result.current.recent).toEqual([]);
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

describe('useBarcodeCommit — commitCode con options.manual (carga manual en mayúsculas)', () => {
  it('manual: true mayusculiza y conserva el punto: "abc.123" -> onAdd("ABC.123")', () => {
    const onAdd = jest.fn();

    const { result } = renderHook(() => useBarcodeCommit(buildOptions({ onAdd })));

    let added: boolean = false;
    act(() => {
      added = result.current.commitCode('abc.123', { manual: true });
    });

    expect(added).toBe(true);
    expect(onAdd).toHaveBeenCalledWith('ABC.123');
    expect(result.current.recent).toEqual([{ code: 'ABC.123', invalid: false }]);
  });

  it('sin options (default, ruta de escaneo): "abc123" NO se mayusculiza, preserva el case', () => {
    const onAdd = jest.fn();

    const { result } = renderHook(() => useBarcodeCommit(buildOptions({ onAdd })));

    act(() => {
      result.current.commitCode('abc123');
    });

    expect(onAdd).toHaveBeenCalledWith('abc123');
  });

  it('manual vs escaneo difieren SOLO en el case: handleScan preserva "abc.123", commitCode manual lo mayusculiza a "ABC.123"', () => {
    const onAddManual = jest.fn();
    const onAddScan = jest.fn();

    const manualHook = renderHook(() => useBarcodeCommit(buildOptions({ onAdd: onAddManual })));
    act(() => {
      manualHook.result.current.commitCode('abc.123', { manual: true });
    });
    expect(onAddManual).toHaveBeenCalledWith('ABC.123');

    const scanHook = renderHook(() => useBarcodeCommit(buildOptions({ onAdd: onAddScan })));
    // handleScan exige confirmReads lecturas idénticas consecutivas (default 2)
    act(() => {
      scanHook.result.current.handleScan('abc.123');
    });
    expect(onAddScan).not.toHaveBeenCalled();
    act(() => {
      scanHook.result.current.handleScan('abc.123');
    });
    expect(onAddScan).toHaveBeenCalledWith('abc.123');
  });

  it('dedup cruzado: "ABC123" ya en existingSerials detecta como duplicado "abc123" cargado a mano (se mayusculiza antes de comparar)', () => {
    const onAdd = jest.fn();
    const playFeedbackSound = jest.fn();
    const vibrate = jest.fn();

    const { result } = renderHook(() =>
      useBarcodeCommit(
        buildOptions({ existingSerials: ['ABC123'], onAdd, playFeedbackSound, vibrate }),
      ),
    );

    let added: boolean = true;
    act(() => {
      added = result.current.commitCode('abc123', { manual: true });
    });

    expect(added).toBe(false);
    expect(onAdd).not.toHaveBeenCalled();
    expect(playFeedbackSound).toHaveBeenCalledWith<[FeedbackKind]>('dup');
    expect(vibrate).toHaveBeenCalledWith(70);
    expect(result.current.feedback).toEqual({ type: 'dup', code: 'ABC123' });
  });

  it('manual: false se comporta igual que el default (preserva case, no mayusculiza)', () => {
    const onAdd = jest.fn();

    const { result } = renderHook(() => useBarcodeCommit(buildOptions({ onAdd })));

    act(() => {
      result.current.commitCode('abc.123', { manual: false });
    });

    expect(onAdd).toHaveBeenCalledWith('abc.123');
  });
});

describe('useBarcodeCommit — handleScan', () => {
  it('código con espacios internos escaneado 2 veces seguidas (<cooldown) agrega una sola vez (la 2da lectura idéntica confirma y comitea, no se vuelve a agregar después por el gate ya consumido)', () => {
    const onAdd = jest.fn();

    const { result } = renderHook(() =>
      useBarcodeCommit(buildOptions({ onAdd, cooldownMs: 2000 })),
    );

    act(() => {
      result.current.handleScan('SN 001 234'); // 1ra lectura: todavía no confirma (confirmReads default = 2)
    });
    act(() => {
      result.current.handleScan('SN001234'); // mismo código normalizado, llamado enseguida: confirma y comitea
    });

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith('SN001234');
  });

  it('pasado el cooldown, el mismo código normalizado se vuelve a procesar', () => {
    jest.useFakeTimers();
    try {
      const onAdd = jest.fn();

      const { result } = renderHook(() =>
        // confirmReads: 1 mantiene la intención original del test (comitear
        // en la primera lectura de cada tanda) sin acoplarlo al gate de
        // confirmación, que se testea aparte.
        useBarcodeCommit(buildOptions({ onAdd, cooldownMs: 2000, confirmReads: 1 })),
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

  it('escaneo de cámara con < > se sanea: dos lecturas idénticas de "<SN-005>" confirman y comitean con el valor saneado', () => {
    const onAdd = jest.fn();

    const { result } = renderHook(() => useBarcodeCommit(buildOptions({ onAdd })));

    act(() => {
      result.current.handleScan('<SN-005>'); // 1ra lectura: no confirma (confirmReads default = 2)
    });
    expect(onAdd).not.toHaveBeenCalled();

    act(() => {
      result.current.handleScan('<SN-005>'); // 2da lectura idéntica (ya saneada internamente): confirma y comitea
    });

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith('SN-005');
  });

  it('escaneo de cámara que queda vacío tras sanear ("<>"): no hace nada, ni siquiera cuenta para el gate de confirmación', () => {
    const onAdd = jest.fn();
    const playFeedbackSound = jest.fn();
    const vibrate = jest.fn();
    const flashFrame = jest.fn();

    const { result } = renderHook(() =>
      useBarcodeCommit(buildOptions({ onAdd, playFeedbackSound, vibrate, flashFrame })),
    );

    act(() => {
      result.current.handleScan('<>');
    });
    act(() => {
      result.current.handleScan('<>');
    });

    expect(onAdd).not.toHaveBeenCalled();
    expect(playFeedbackSound).not.toHaveBeenCalled();
    expect(vibrate).not.toHaveBeenCalled();
    expect(flashFrame).not.toHaveBeenCalled();
    expect(result.current.feedback).toBeNull();
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

describe('useBarcodeCommit — gate de confirmación', () => {
  it('una sola lectura NO comitea (default confirmReads=2)', () => {
    const onAdd = jest.fn();

    const { result } = renderHook(() => useBarcodeCommit(buildOptions({ onAdd })));

    act(() => {
      result.current.handleScan('ABC.123');
    });

    expect(onAdd).not.toHaveBeenCalled();
    expect(result.current.feedback).toBeNull();
    expect(result.current.recent).toEqual([]);
  });

  it('dos lecturas idénticas consecutivas (dentro de la ventana) comitean UNA vez', () => {
    const onAdd = jest.fn();

    const { result } = renderHook(() => useBarcodeCommit(buildOptions({ onAdd })));

    act(() => {
      result.current.handleScan('ABC.123');
    });
    act(() => {
      result.current.handleScan('ABC.123');
    });

    expect(onAdd).toHaveBeenCalledTimes(1);
    // sanitizeSerial conserva el '.' (forma parte de [A-Za-z0-9.*-])
    expect(onAdd).toHaveBeenCalledWith('ABC.123');
  });

  it('valor que cambia a mitad de camino no confirma (ninguno llega a 2 consecutivas)', () => {
    const onAdd = jest.fn();

    const { result } = renderHook(() => useBarcodeCommit(buildOptions({ onAdd })));

    act(() => {
      result.current.handleScan('AAA');
    });
    act(() => {
      result.current.handleScan('BBB');
    });
    act(() => {
      result.current.handleScan('AAA');
    });

    expect(onAdd).not.toHaveBeenCalled();
  });

  it('ventana vencida reinicia el candidato: dos lecturas iguales separadas por más de confirmWindowMs NO comitean', () => {
    jest.useFakeTimers();
    try {
      const onAdd = jest.fn();

      const { result } = renderHook(() =>
        useBarcodeCommit(buildOptions({ onAdd, confirmWindowMs: 400 })),
      );

      act(() => {
        result.current.handleScan('ABC.123');
      });
      act(() => {
        jest.advanceTimersByTime(401);
      });
      act(() => {
        result.current.handleScan('ABC.123');
      });

      expect(onAdd).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('confirmReads: 3 recién comitea en la 3ra lectura idéntica, no antes', () => {
    const onAdd = jest.fn();

    const { result } = renderHook(() =>
      useBarcodeCommit(buildOptions({ onAdd, confirmReads: 3 })),
    );

    act(() => {
      result.current.handleScan('ABC.123');
    });
    expect(onAdd).not.toHaveBeenCalled();

    act(() => {
      result.current.handleScan('ABC.123');
    });
    expect(onAdd).not.toHaveBeenCalled();

    act(() => {
      result.current.handleScan('ABC.123');
    });
    expect(onAdd).toHaveBeenCalledTimes(1);
    // sanitizeSerial conserva el '.' (forma parte de [A-Za-z0-9.*-])
    expect(onAdd).toHaveBeenCalledWith('ABC.123');
  });

  it('espacios internos entre lecturas normalizan al mismo valor, confirman y comitean una vez con el valor sin espacios', () => {
    const onAdd = jest.fn();

    const { result } = renderHook(() => useBarcodeCommit(buildOptions({ onAdd })));

    act(() => {
      result.current.handleScan('AB C');
    });
    act(() => {
      result.current.handleScan('ABC');
    });

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith('ABC');
  });

  it('interacción gate + cooldown: tras confirmar y comitear, seguir mandando el mismo código dentro del cooldown no vuelve a agregar', () => {
    jest.useFakeTimers();
    try {
      const onAdd = jest.fn();

      const { result } = renderHook(() =>
        useBarcodeCommit(buildOptions({ onAdd, cooldownMs: 2000 })),
      );

      act(() => {
        result.current.handleScan('ABC.123'); // 1ra lectura: no confirma
      });
      act(() => {
        result.current.handleScan('ABC.123'); // 2da lectura: confirma y comitea
      });
      expect(onAdd).toHaveBeenCalledTimes(1);

      act(() => {
        jest.advanceTimersByTime(500); // sigue dentro del cooldown de 2000ms
      });
      act(() => {
        result.current.handleScan('ABC.123');
      });
      act(() => {
        result.current.handleScan('ABC.123');
      });

      expect(onAdd).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('reset() limpia el candidato pendiente: una lectura a medio confirmar se descarta y no cuenta para la siguiente', () => {
    const onAdd = jest.fn();

    const { result } = renderHook(() => useBarcodeCommit(buildOptions({ onAdd })));

    act(() => {
      result.current.handleScan('ABC.123'); // candidato a medio confirmar (count=1)
    });

    act(() => {
      result.current.reset();
    });

    act(() => {
      result.current.handleScan('ABC.123'); // si no se hubiera reseteado, esta sería la 2da y confirmaría
    });

    expect(onAdd).not.toHaveBeenCalled();
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
