/**
 * The backend puts the session expiry (next midnight in Argentina) in the token's `exp` claim, so the
 * app can end an expired session even when no request is made.
 */

/** When the token expires, in epoch milliseconds; null if the token can't be read. */
export function tokenExpiresAt(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const claims: unknown = JSON.parse(atob(base64));
    if (typeof claims !== 'object' || claims === null || !('exp' in claims)) return null;
    return typeof claims.exp === 'number' ? claims.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** An unreadable token is left to the backend, which answers 401 if it is really invalid. */
export function isExpired(token: string, now: number): boolean {
  const expiresAt = tokenExpiresAt(token);
  return expiresAt !== null && now >= expiresAt;
}

// Well under the one minute allowed; a single timer at `exp` is unreliable while the app is in the background.
export const SESSION_CHECK_EVERY_MS = 30_000;

type SessionWatchDeps = {
  onExpired: () => void;
  now: () => number;
  /** Calls back each time the app returns to the foreground; returns how to unsubscribe. */
  subscribeForeground: (onForeground: () => void) => () => void;
};

/** Checks the expiry now, every 30 s and on returning to the foreground. Returns the function that stops it. */
export function startSessionWatch(token: string, deps: SessionWatchDeps): () => void {
  const check = () => {
    if (isExpired(token, deps.now())) deps.onExpired();
  };
  check();
  const timer = setInterval(check, SESSION_CHECK_EVERY_MS);
  const unsubscribe = deps.subscribeForeground(check);
  return () => {
    clearInterval(timer);
    unsubscribe();
  };
}
