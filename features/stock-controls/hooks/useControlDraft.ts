import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { StockControlType } from '../types';
import { buildDraft, hasDraftContent, type ControlDraft, type DraftInput } from '../lib/controlDraft';
import {
  clearControlDraft,
  loadControlDraft,
  saveControlDraft,
} from '../services/controlDraftStorage';

const SAVE_DELAY_MS = 800;

type Options = {
  userId: string | undefined;
  type: StockControlType;
  /** Current form state; null while the form isn't ready to be saved (e.g. before restoring). */
  form: Omit<DraftInput, 'userId' | 'type'> | null;
};

/**
 * Keeps the in-progress control saved on the device while the operator types,
 * so leaving the screen (or Android killing the app) doesn't lose the load.
 */
export function useControlDraft({ userId, type, form }: Options) {
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const pending = useRef<(() => Promise<void>) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(
    async (input: DraftInput) => {
      try {
        if (hasDraftContent(input)) {
          const draft = buildDraft(input, new Date());
          await saveControlDraft(draft);
          setSavedAt(draft.savedAt);
        } else {
          await clearControlDraft(input.userId, input.type);
          setSavedAt(null);
        }
      } catch (e) {
        // A failed save must not block the control itself; the next change retries.
        console.warn('Could not save the stock control draft', e);
      }
    },
    [],
  );

  useEffect(() => {
    if (!userId || !form) return;
    const input: DraftInput = { userId, type, ...form };
    const run = () => persist(input);
    pending.current = run;
    timer.current = setTimeout(() => {
      pending.current = null;
      run();
    }, SAVE_DELAY_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [userId, type, form, persist]);

  // Going to background may be the last chance before Android kills the app.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && pending.current) {
        const run = pending.current;
        pending.current = null;
        run();
      }
    });
    return () => sub.remove();
  }, []);

  // Leaving the screen flushes the last keystrokes too.
  useEffect(
    () => () => {
      pending.current?.();
    },
    [],
  );

  const load = useCallback(async (): Promise<ControlDraft | null> => {
    if (!userId) return null;
    try {
      const draft = await loadControlDraft(userId, type);
      setSavedAt(draft?.savedAt ?? null);
      return draft;
    } catch (e) {
      console.warn('Could not read the stock control draft', e);
      return null;
    }
  }, [userId, type]);

  const discard = useCallback(async () => {
    // A save scheduled just before submitting must not bring the draft back.
    if (timer.current) clearTimeout(timer.current);
    pending.current = null;
    setSavedAt(null);
    if (!userId) return;
    try {
      await clearControlDraft(userId, type);
    } catch (e) {
      console.warn('Could not delete the stock control draft', e);
    }
  }, [userId, type]);

  return { savedAt, load, discard };
}
