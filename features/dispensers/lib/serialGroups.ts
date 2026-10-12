export type NumberedSerial = { code: string; position: number };

export type SerialGroup = { excluded: boolean; serials: NumberedSerial[] };

/**
 * Splits a movement's serials so the excluded ones share a single header
 * (with their count) instead of repeating the same legend on every row.
 * Excluded go first; positions stay the ones of the original list.
 */
export function groupSerialsByExclusion(serials: string[], excluded: string[]): SerialGroup[] {
  const excludedSet = new Set(excluded);
  const numbered = serials.map((code, i) => ({ code, position: i + 1 }));
  const out = numbered.filter((s) => excludedSet.has(s.code));
  const rest = numbered.filter((s) => !excludedSet.has(s.code));

  const groups: SerialGroup[] = [];
  if (out.length > 0) groups.push({ excluded: true, serials: out });
  if (rest.length > 0) groups.push({ excluded: false, serials: rest });
  return groups;
}
