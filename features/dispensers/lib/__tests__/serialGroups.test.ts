import { groupSerialsByExclusion } from '../serialGroups';

describe('groupSerialsByExclusion', () => {
  it('returns a single plain group when nothing is excluded', () => {
    expect(groupSerialsByExclusion(['A', 'B'], [])).toEqual([
      { excluded: false, serials: [{ code: 'A', position: 1 }, { code: 'B', position: 2 }] },
    ]);
  });

  it('puts the excluded serials first under their own group, keeping the original positions', () => {
    expect(groupSerialsByExclusion(['A', 'B', 'C'], ['C', 'A'])).toEqual([
      { excluded: true, serials: [{ code: 'A', position: 1 }, { code: 'C', position: 3 }] },
      { excluded: false, serials: [{ code: 'B', position: 2 }] },
    ]);
  });

  it('returns only the excluded group when all of them are excluded', () => {
    expect(groupSerialsByExclusion(['A', 'B'], ['A', 'B'])).toEqual([
      { excluded: true, serials: [{ code: 'A', position: 1 }, { code: 'B', position: 2 }] },
    ]);
  });

  it('ignores excluded codes that are not in the list and returns no groups for an empty list', () => {
    expect(groupSerialsByExclusion(['A'], ['Z'])).toEqual([
      { excluded: false, serials: [{ code: 'A', position: 1 }] },
    ]);
    expect(groupSerialsByExclusion([], ['Z'])).toEqual([]);
  });
  it('keeps duplicated codes as separate rows in the same group', () => {
    expect(groupSerialsByExclusion(['A', 'B', 'A'], ['A'])).toEqual([
      { excluded: true, serials: [{ code: 'A', position: 1 }, { code: 'A', position: 3 }] },
      { excluded: false, serials: [{ code: 'B', position: 2 }] },
    ]);
  });

  it('does not mutate its inputs', () => {
    const serials = ['A', 'B'];
    const excluded = ['B'];
    groupSerialsByExclusion(serials, excluded);
    expect(serials).toEqual(['A', 'B']);
    expect(excluded).toEqual(['B']);
  });
});
