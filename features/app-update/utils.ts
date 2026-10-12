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

/** Etiqueta de versión para mostrar en pantalla; sin versión legible, solo la marca. */
export function formatVersionLabel(version: string | null): string {
  return version ? `LOOP v${version}` : 'LOOP';
}

// "•" is always a bullet; "-" and "*" only when a space (or nothing) follows,
// so lines like "-5% de consumo" keep their sign.
const LIST_MARKER = /^(?:•|[-*](?=\s|$))\s*/;

/** Release notes arrive as plain text: one item per non-empty line, list markers stripped. */
export function splitReleaseNotes(notes: string | null | undefined): string[] {
  return (notes ?? '')
    .split('\n')
    .map((line) => line.trim().replace(LIST_MARKER, '').trim())
    .filter(Boolean);
}
