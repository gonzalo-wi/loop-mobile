const MS_PER_SECOND = 1000;

/**
 * The timer follows the form's serial list: it starts when the list stops being
 * empty, keeps its start while there are serials (a failed submit leaves them in
 * place) and resets once the list is empty again.
 */
export function nextStartedAt(startedAt: number | null, serialCount: number, now: number): number | null {
  if (serialCount <= 0) return null;
  return startedAt ?? now;
}

/** Whole seconds since the start; undefined when not started. */
export function elapsedSeconds(startedAt: number | null, now: number): number | undefined {
  if (startedAt === null) return undefined;
  // A clock adjusted backwards must not produce a negative duration.
  return Math.max(0, Math.floor((now - startedAt) / MS_PER_SECOND));
}
