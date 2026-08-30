/**
 * Tests de la LÓGICA de `BarcodeScannerModal` (sonido de feedback,
 * no-bloqueo ante error de audio, normalización/dedupe de `handleScan`).
 *
 * NOTA DE TESTABILIDAD: el proyecto testea solo lógica pura (ts-jest,
 * `testEnvironment: node`, sin @testing-library/react-native ni
 * react-test-renderer instalados — ver package.json/jest.config.js). El
 * componente no expone `commitCode`/`handleScan`/`playFeedbackSound`
 * como funciones testeables de forma aislada (son closures internas de
 * `BarcodeScannerModal`, no exportadas), así que no se pueden importar
 * directamente sin renderizar el componente completo.
 *
 * Para no introducir un framework de rendering nuevo (fuera del alcance de
 * esta tarea) y sin tocar el código de producción, este archivo reproduce
 * esas tres funciones como un espejo 1:1 del código real (mismas líneas,
 * mismo orden de side-effects), parametrizado con las dependencias que en
 * el componente viven en refs/estado (players de audio, `Vibration.vibrate`,
 * `onAdd`, `existingSerials`, `invalidSerials`). Si `commitCode`/`handleScan`
 * cambian en `BarcodeScannerModal.tsx`, este espejo debe actualizarse a la par.
 *
 * Recomendación para mejorar la testabilidad real (no aplicada acá porque
 * excede el alcance de "solo tests"): extraer `commitCode`/`handleScan`/
 * `playFeedbackSound` a un hook o módulo puro (`useBarcodeCommit`, por ej.)
 * que reciba las deps por parámetro, exportado e importable sin JSX. Así se
 * testearía el código real en vez de un espejo.
 */

import * as fs from 'fs';
import * as path from 'path';

// Guard de drift: si alguien cambia la lógica real de commitCode/handleScan/
// playFeedbackSound sin actualizar el espejo de este archivo, este test lo
// detecta (no valida comportamiento, solo que las expresiones clave sigan
// presentes en el fuente).
describe('BarcodeScannerModal.tsx — guard de consistencia con el espejo de test', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'BarcodeScannerModal.tsx'),
    'utf-8',
  );

  it('sigue normalizando con /\\s+/g antes de comparar en commitCode y handleScan', () => {
    const matches = source.match(/raw\.replace\(\/\\s\+\/g, ''\)/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2); // commitCode + handleScan
  });

  it('sigue disparando playFeedbackSound en los 3 resultados (dup/invalid/ok)', () => {
    expect(source).toMatch(/playFeedbackSound\('dup'\)/);
    expect(source).toMatch(/playFeedbackSound\(invalid \? 'invalid' : 'ok'\)/);
  });

  it('playFeedbackSound sigue envuelto en try/catch (no debe poder romper el flujo)', () => {
    const fnMatch = source.match(/function playFeedbackSound[\s\S]*?\n  }\n/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch![0]).toMatch(/try\s*{/);
    expect(fnMatch![0]).toMatch(/catch/);
  });
});

type AudioPlayerMock = {
  seekTo: jest.Mock<Promise<void>, [number]>;
  play: jest.Mock<void, []>;
};

function buildPlayer(overrides: Partial<AudioPlayerMock> = {}): AudioPlayerMock {
  return {
    seekTo: jest.fn().mockResolvedValue(undefined),
    play: jest.fn(),
    ...overrides,
  };
}

// --- Espejo fiel de BarcodeScannerModal.tsx --------------------------------

function normalizeSerial(serial: string): string {
  return serial.replace(/\s+/g, '').toUpperCase();
}

function makeScannerLogic(deps: {
  okPlayer: AudioPlayerMock | null;
  errorPlayer: AudioPlayerMock | null;
  vibrate: (pattern: number | number[]) => void;
  onAdd: (serial: string) => void;
  existingSerials: string[];
  invalidSerials?: Set<string>;
}) {
  const lastRef = { current: { value: '', t: 0 } };
  const recent: { code: string; invalid: boolean }[] = [];
  const feedbacks: { type: 'ok' | 'dup' | 'invalid'; code: string }[] = [];

  // Espejo de playFeedbackSound.
  function playFeedbackSound(type: 'ok' | 'dup' | 'invalid') {
    try {
      const player = type === 'ok' ? deps.okPlayer : deps.errorPlayer;
      if (!player) return;
      player.seekTo(0).catch(() => {});
      player.play();
    } catch {
      // noop
    }
  }

  // Espejo de commitCode.
  function commitCode(raw: string): boolean {
    const code = raw.replace(/\s+/g, '');
    if (!code) return false;

    if (deps.existingSerials.includes(code)) {
      deps.vibrate(70);
      playFeedbackSound('dup');
      feedbacks.push({ type: 'dup', code });
      return false;
    }

    const invalid = deps.invalidSerials?.has(normalizeSerial(code)) ?? false;

    deps.vibrate(invalid ? [0, 90, 70, 90] : 35);
    playFeedbackSound(invalid ? 'invalid' : 'ok');
    deps.onAdd(code);
    recent.unshift({ code, invalid });
    feedbacks.push({ type: invalid ? 'invalid' : 'ok', code });
    return true;
  }

  // Espejo de handleScan.
  function handleScan(rawData: string | undefined, now: number): void {
    const raw = rawData?.trim();
    if (!raw) return;
    const code = raw.replace(/\s+/g, '');

    if (code === lastRef.current.value && now - lastRef.current.t < 2000) return;
    lastRef.current = { value: code, t: now };

    commitCode(code);
  }

  return { commitCode, handleScan, lastRef, recent, feedbacks };
}

// --- Tests -------------------------------------------------------------

describe('BarcodeScannerModal — feedback sonoro (commitCode)', () => {
  it('en un código OK reproduce el sonido ok (seekTo(0) + play) y no toca el player de error', () => {
    const okPlayer = buildPlayer();
    const errorPlayer = buildPlayer();
    const onAdd = jest.fn();
    const vibrate = jest.fn();

    const { commitCode } = makeScannerLogic({
      okPlayer,
      errorPlayer,
      vibrate,
      onAdd,
      existingSerials: [],
    });

    const added = commitCode('SN-001');

    expect(added).toBe(true);
    expect(okPlayer.seekTo).toHaveBeenCalledWith(0);
    expect(okPlayer.play).toHaveBeenCalledTimes(1);
    expect(errorPlayer.play).not.toHaveBeenCalled();
    expect(onAdd).toHaveBeenCalledWith('SN-001');
    expect(vibrate).toHaveBeenCalledWith(35);
  });

  it('en un código duplicado reproduce el sonido de error y NO llama a onAdd', () => {
    const okPlayer = buildPlayer();
    const errorPlayer = buildPlayer();
    const onAdd = jest.fn();
    const vibrate = jest.fn();

    const { commitCode } = makeScannerLogic({
      okPlayer,
      errorPlayer,
      vibrate,
      onAdd,
      existingSerials: ['SN-001'],
    });

    const added = commitCode('SN-001');

    expect(added).toBe(false);
    expect(errorPlayer.seekTo).toHaveBeenCalledWith(0);
    expect(errorPlayer.play).toHaveBeenCalledTimes(1);
    expect(okPlayer.play).not.toHaveBeenCalled();
    expect(onAdd).not.toHaveBeenCalled();
    expect(vibrate).toHaveBeenCalledWith(70);
  });

  it('en un código inválido (no registrado en Aguas) reproduce el sonido de error pero SÍ llama a onAdd', () => {
    const okPlayer = buildPlayer();
    const errorPlayer = buildPlayer();
    const onAdd = jest.fn();
    const vibrate = jest.fn();

    const { commitCode } = makeScannerLogic({
      okPlayer,
      errorPlayer,
      vibrate,
      onAdd,
      existingSerials: [],
      invalidSerials: new Set(['SN-002']),
    });

    const added = commitCode('SN-002');

    expect(added).toBe(true);
    expect(errorPlayer.play).toHaveBeenCalledTimes(1);
    expect(okPlayer.play).not.toHaveBeenCalled();
    expect(onAdd).toHaveBeenCalledWith('SN-002');
    expect(vibrate).toHaveBeenCalledWith([0, 90, 70, 90]);
  });

  it('si player es null (falló la precarga) no explota y el flujo de agregado sigue funcionando', () => {
    const onAdd = jest.fn();
    const vibrate = jest.fn();

    const { commitCode } = makeScannerLogic({
      okPlayer: null,
      errorPlayer: null,
      vibrate,
      onAdd,
      existingSerials: [],
    });

    expect(() => commitCode('SN-001')).not.toThrow();
    expect(onAdd).toHaveBeenCalledWith('SN-001');
  });

  it('si player.play() tira una excepción sincrónica, commitCode no se rompe y el código igual se agrega', () => {
    const okPlayer = buildPlayer({
      play: jest.fn(() => {
        throw new Error('boom: audio device busy');
      }),
    });
    const errorPlayer = buildPlayer();
    const onAdd = jest.fn();
    const vibrate = jest.fn();

    const { commitCode } = makeScannerLogic({
      okPlayer,
      errorPlayer,
      vibrate,
      onAdd,
      existingSerials: [],
    });

    let added: boolean | undefined;
    expect(() => {
      added = commitCode('SN-001');
    }).not.toThrow();

    expect(added).toBe(true);
    expect(onAdd).toHaveBeenCalledWith('SN-001');
  });

  it('si player.seekTo() rechaza (promesa), no bloquea ni rompe el flujo (el .catch interno lo absorbe)', async () => {
    const okPlayer = buildPlayer({
      seekTo: jest.fn().mockRejectedValue(new Error('seek failed')),
    });
    const errorPlayer = buildPlayer();
    const onAdd = jest.fn();
    const vibrate = jest.fn();

    const { commitCode } = makeScannerLogic({
      okPlayer,
      errorPlayer,
      vibrate,
      onAdd,
      existingSerials: [],
    });

    const added = commitCode('SN-001');
    expect(added).toBe(true);
    expect(onAdd).toHaveBeenCalledWith('SN-001');

    // Deja que el .catch(() => {}) interno procese el rechazo sin que quede
    // como unhandled rejection.
    await Promise.resolve();
    await Promise.resolve();
    expect(okPlayer.play).toHaveBeenCalledTimes(1);
  });
});

describe('BarcodeScannerModal — normalización y dedupe en handleScan', () => {
  it('un código con espacios internos escaneado dos veces seguidas (<2s) NO se agrega dos veces', () => {
    const okPlayer = buildPlayer();
    const errorPlayer = buildPlayer();
    const onAdd = jest.fn();
    const vibrate = jest.fn();

    const { handleScan } = makeScannerLogic({
      okPlayer,
      errorPlayer,
      vibrate,
      onAdd,
      existingSerials: [],
    });

    const t0 = 1_000_000;
    handleScan('SN 001 234', t0);
    handleScan('SN001234', t0 + 500); // mismo código ya normalizado, <2s después

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith('SN001234');
  });

  it('compara valores ya normalizados: variantes con distinto espaciado del mismo código cuentan como iguales para el cooldown', () => {
    const okPlayer = buildPlayer();
    const errorPlayer = buildPlayer();
    const onAdd = jest.fn();
    const vibrate = jest.fn();

    const { handleScan } = makeScannerLogic({
      okPlayer,
      errorPlayer,
      vibrate,
      onAdd,
      existingSerials: [],
    });

    const t0 = 2_000_000;
    handleScan('  SN 001  ', t0);
    handleScan('SN001', t0 + 100);
    handleScan(' SN 0 0 1 ', t0 + 200);

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('pasado el cooldown de 2s, el mismo código (normalizado) se vuelve a agregar', () => {
    const okPlayer = buildPlayer();
    const errorPlayer = buildPlayer();
    const onAdd = jest.fn();
    const vibrate = jest.fn();

    const { handleScan } = makeScannerLogic({
      okPlayer,
      errorPlayer,
      vibrate,
      onAdd,
      // Nota: fuera de cooldown, commitCode lo trataría como duplicado si
      // ya está en existingSerials; acá simulamos que la screen padre no lo
      // sumó a existingSerials (comportamiento fuera del alcance de
      // handleScan) para aislar puntualmente la lógica del cooldown.
      existingSerials: [],
    });

    const t0 = 3_000_000;
    handleScan('SN 001', t0);
    handleScan('SN 001', t0 + 2001); // 2001ms después: ya pasó el cooldown

    expect(onAdd).toHaveBeenCalledTimes(2);
  });

  it('un data vacío o solo espacios no dispara commitCode (no llama a onAdd ni a los players)', () => {
    const okPlayer = buildPlayer();
    const errorPlayer = buildPlayer();
    const onAdd = jest.fn();
    const vibrate = jest.fn();

    const { handleScan } = makeScannerLogic({
      okPlayer,
      errorPlayer,
      vibrate,
      onAdd,
      existingSerials: [],
    });

    handleScan('   ', Date.now());
    handleScan(undefined, Date.now());

    expect(onAdd).not.toHaveBeenCalled();
    expect(okPlayer.play).not.toHaveBeenCalled();
    expect(errorPlayer.play).not.toHaveBeenCalled();
  });
});
