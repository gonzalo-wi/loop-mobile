import { formatVersionLabel, splitReleaseNotes } from '../utils';

describe('formatVersionLabel', () => {
  it('shows the installed version', () => {
    expect(formatVersionLabel('1.2.3')).toBe('LOOP v1.2.3');
  });

  it('omits the version when it cannot be read', () => {
    expect(formatVersionLabel(null)).toBe('LOOP');
  });
});

describe('splitReleaseNotes', () => {
  it('returns one item per non-empty line, without list markers', () => {
    expect(splitReleaseNotes('- Escaneo más rápido\n\n• Carga manual en MAYÚSCULAS\n* Otro')).toEqual([
      'Escaneo más rápido',
      'Carga manual en MAYÚSCULAS',
      'Otro',
    ]);
  });

  it('returns no items for missing or blank notes', () => {
    expect(splitReleaseNotes(null)).toEqual([]);
    expect(splitReleaseNotes(undefined)).toEqual([]);
    expect(splitReleaseNotes('  \n ')).toEqual([]);
  });

  it('keeps a single-paragraph note as one item', () => {
    expect(splitReleaseNotes('Mejoras de estabilidad.')).toEqual(['Mejoras de estabilidad.']);
  });

  it('handles CRLF line endings without leaving carriage returns', () => {
    expect(splitReleaseNotes('- Uno\r\n- Dos\r\n\r\n- Tres\r\n')).toEqual(['Uno', 'Dos', 'Tres']);
  });

  it('strips markers that are preceded by leading whitespace', () => {
    expect(splitReleaseNotes('  - Uno\n\t• Dos\n   * Tres')).toEqual(['Uno', 'Dos', 'Tres']);
  });

  it('always strips a "•", but "-" and "*" only when a space follows', () => {
    expect(splitReleaseNotes('•Dos\n-5% de consumo\n*Nuevo* escaneo')).toEqual([
      'Dos',
      '-5% de consumo',
      '*Nuevo* escaneo',
    ]);
  });

  it('drops lines that contain only a marker', () => {
    expect(splitReleaseNotes('-\n• \n*  \n- Uno\n  -')).toEqual(['Uno']);
  });
});
