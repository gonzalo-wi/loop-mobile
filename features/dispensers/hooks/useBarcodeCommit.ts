import { useCallback, useRef, useState } from 'react';
import { normalizeSerial } from '../services/dispenserValidationApi';

export type FeedbackKind = 'ok' | 'dup' | 'invalid';

export type Feedback = { type: FeedbackKind; code: string } | null;

export type RecentCode = { code: string; invalid: boolean };

export type UseBarcodeCommitOptions = {
  /** Seriales ya agregados; sirve para avisar duplicados. */
  existingSerials: string[];
  /** Seriales "no registrados" en Aguas (normalizados): se rechazan al escanear. */
  invalidSerials?: Set<string>;
  /** Se llama con cada serial nuevo escaneado. */
  onAdd: (serial: string) => void;
  /** Reproduce el sonido de feedback correspondiente (ok/dup/invalid). */
  playFeedbackSound: (kind: FeedbackKind) => void;
  /** Dispara la vibración (patrón distinto según el caso). */
  vibrate: (pattern: number | number[]) => void;
  /** Flashea el borde del marco de escaneo. */
  flashFrame: () => void;
  /** Milisegundos que se muestra el feedback antes de limpiarse. Default 1400. */
  feedbackDurationMs?: number;
  /** Ventana de cooldown (ms) para descartar el mismo código repetido. Default 2000. */
  cooldownMs?: number;
};

export type UseBarcodeCommitResult = {
  /** Feedback del último escaneo (ok/dup/invalid), se autolimpia. */
  feedback: Feedback;
  /** Últimos códigos agregados (hasta 4), más reciente primero. */
  recent: RecentCode[];
  /** Agrega un código (venga del escáner o de la carga manual). Devuelve true si se agregó. */
  commitCode: (raw: string) => boolean;
  /** Maneja un resultado de escaneo de cámara: normaliza, aplica cooldown y comitea. */
  handleScan: (data: string | undefined) => void;
  /** Limpia el estado efímero (feedback, recientes). Útil al cerrar el modal. */
  reset: () => void;
};

/**
 * Lógica pura (sin JSX) de commit de códigos escaneados/ingresados a mano en
 * el escáner de dispensers: normalización, detección de duplicado/inválido,
 * feedback visual/sonoro/háptico y cooldown de re-escaneo.
 *
 * Los efectos con dependencias nativas (sonido, vibración, flash del marco)
 * se reciben como callbacks inyectables para poder testear esta lógica sin
 * renderizar el componente ni importar módulos nativos.
 */
export function useBarcodeCommit(options: UseBarcodeCommitOptions): UseBarcodeCommitResult {
  const {
    existingSerials,
    invalidSerials,
    onAdd,
    playFeedbackSound,
    vibrate,
    flashFrame,
    feedbackDurationMs = 1400,
    cooldownMs = 2000,
  } = options;

  const [feedback, setFeedback] = useState<Feedback>(null);
  const [recent, setRecent] = useState<RecentCode[]>([]);

  const lastRef = useRef<{ value: string; t: number }>({ value: '', t: 0 });
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedback = useCallback(
    (next: Feedback) => {
      setFeedback(next);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      feedbackTimer.current = setTimeout(() => setFeedback(null), feedbackDurationMs);
    },
    [feedbackDurationMs],
  );

  // Las deps inyectadas (sonido, vibración, flash) tocan APIs nativas y
  // pueden lanzar. Esta es la garantía canónica: un fallo ahí nunca debe
  // cortar `commitCode` a mitad (en particular, `onAdd` debe dispararse
  // igual). Se ejecuta y se descarta cualquier excepción.
  const safeCall = useCallback((fn: () => void) => {
    try {
      fn();
    } catch {
      // noop: una dep inyectada (sonido/vibración/flash) no debe romper el flujo de escaneo
    }
  }, []);

  const commitCode = useCallback(
    (raw: string): boolean => {
      const code = raw.replace(/\s+/g, ''); // saca todos los espacios (puntas e internos)
      if (!code) return false;

      if (existingSerials.includes(code)) {
        safeCall(() => vibrate(70));
        safeCall(() => playFeedbackSound('dup'));
        showFeedback({ type: 'dup', code });
        return false;
      }

      // No registrado en Aguas: se agrega igual, pero marcado en rojo (no se enviará).
      const invalid = invalidSerials?.has(normalizeSerial(code)) ?? false;

      safeCall(() => vibrate(invalid ? [0, 90, 70, 90] : 35));
      safeCall(() => playFeedbackSound(invalid ? 'invalid' : 'ok'));
      safeCall(() => flashFrame());
      onAdd(code);
      setRecent((prev) => [{ code, invalid }, ...prev.filter((r) => r.code !== code)].slice(0, 4));
      showFeedback({ type: invalid ? 'invalid' : 'ok', code });
      return true;
    },
    [
      existingSerials,
      invalidSerials,
      onAdd,
      playFeedbackSound,
      vibrate,
      flashFrame,
      showFeedback,
      safeCall,
    ],
  );

  const handleScan = useCallback(
    (data: string | undefined) => {
      const raw = data?.trim();
      if (!raw) return;
      const code = raw.replace(/\s+/g, ''); // misma normalización que usa commitCode

      const now = Date.now();
      if (code === lastRef.current.value && now - lastRef.current.t < cooldownMs) return;
      lastRef.current = { value: code, t: now };

      commitCode(code);
    },
    [commitCode, cooldownMs],
  );

  const reset = useCallback(() => {
    if (feedbackTimer.current) {
      clearTimeout(feedbackTimer.current);
      feedbackTimer.current = null;
    }
    setRecent([]);
    setFeedback(null);
  }, []);

  return { feedback, recent, commitCode, handleScan, reset };
}
