/**
 * Compara versiones semver simples ("1.2.3"). Devuelve true si `latest` es
 * más nueva que `current`. Ignora sufijos no numéricos.
 */
export function isNewerVersion(latest: string, current: string): boolean {
  const toParts = (v: string) =>
    v.split('.').map((n) => parseInt(n, 10) || 0);
  const a = toParts(latest);
  const b = toParts(current);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}
