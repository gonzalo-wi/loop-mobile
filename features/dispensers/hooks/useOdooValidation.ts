import { useEffect, useMemo, useRef, useState } from 'react';
import { validateOdooEquipment } from '../services/odooApi';
import {
  resolveValidationStatus,
  type OdooValidationStatus,
  type SettledValidation,
} from '../lib/odooSubmitGate';
import type { DispenserMovementType, OdooValidationResult } from '../types';

// Debounce para no spammear la validación Odoo mientras se escanea en tanda.
const ODOO_VALIDATE_DEBOUNCE_MS = 900;

const EMPTY_RESULTS: ReadonlyMap<string, OdooValidationResult> = new Map();

/**
 * Batch-validates the serials against Odoo (LOAD only), debounced. The status is derived
 * from which serials the last answer covers, so stale responses can't unblock a newer list.
 */
export function useOdooValidation(type: DispenserMovementType, codes: readonly string[]) {
  const [results, setResults] = useState<ReadonlyMap<string, OdooValidationResult>>(EMPTY_RESULTS);
  const [settled, setSettled] = useState<SettledValidation | null>(null);
  const requestId = useRef(0);
  const key = codes.join(',');

  useEffect(() => {
    // Bumped before the early return so an in-flight LOAD answer is dropped after switching type.
    const id = ++requestId.current;
    if (type !== 'LOAD') return;

    if (codes.length === 0) {
      setResults(EMPTY_RESULTS);
      setSettled(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const answer = await validateOdooEquipment([...codes]);
        if (id !== requestId.current) return;
        setResults(new Map(answer.map((r) => [r.serie, r])));
        setSettled({ codes, failed: false });
      } catch {
        if (id !== requestId.current) return;
        // Sin conexión con Odoo → no bloqueamos: el backend vuelve a validar al enviar.
        setSettled({ codes, failed: true });
      }
    }, ODOO_VALIDATE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // `key` stands for the content of `codes`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, type]);

  const status: OdooValidationStatus = useMemo(
    () => (type === 'LOAD' ? resolveValidationStatus(settled, codes) : 'done'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settled, key, type],
  );

  return { results, status };
}
