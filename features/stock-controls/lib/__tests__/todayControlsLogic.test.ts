import { countTodayControls, sortRejectedFirst } from '../todayControlsLogic';
import type { StockControlStatus } from '../../types';

function ctrl(id: string, status: StockControlStatus) {
  return { id, status };
}

describe('countTodayControls', () => {
  it('returns zeros for an empty list', () => {
    expect(countTodayControls([])).toEqual({ pending: 0, accepted: 0, rejected: 0 });
  });

  it('counts pending, accepted and rejected controls separately', () => {
    const controls = [
      ctrl('1', 'PENDING_DRIVER_APPROVAL'),
      ctrl('2', 'ACCEPTED_BY_DRIVER'),
      ctrl('3', 'REJECTED_BY_DRIVER'),
      ctrl('4', 'REJECTED_BY_DRIVER'),
      ctrl('5', 'CONTROLLED'),
    ];
    expect(countTodayControls(controls)).toEqual({ pending: 1, accepted: 1, rejected: 2 });
  });
});

describe('countTodayControls (other statuses)', () => {
  it.each(['SENT_TO_AGUAS', 'AGUAS_ERROR', 'CANCELLED'] as const)('ignores %s', (status) => {
    expect(countTodayControls([ctrl('1', status)])).toEqual({ pending: 0, accepted: 0, rejected: 0 });
  });
});

describe('sortRejectedFirst', () => {
  it('returns an empty list for empty input', () => {
    expect(sortRejectedFirst([])).toEqual([]);
  });

  it('keeps the order when every control is rejected', () => {
    const controls = [ctrl('x', 'REJECTED_BY_DRIVER'), ctrl('y', 'REJECTED_BY_DRIVER')];
    expect(sortRejectedFirst(controls).map((c) => c.id)).toEqual(['x', 'y']);
  });

  it('keeps the order when none is rejected', () => {
    const controls = [ctrl('x', 'CONTROLLED'), ctrl('y', 'ACCEPTED_BY_DRIVER')];
    expect(sortRejectedFirst(controls).map((c) => c.id)).toEqual(['x', 'y']);
  });

  it('puts rejected controls first and keeps the relative order of the rest', () => {
    const controls = [
      ctrl('a', 'ACCEPTED_BY_DRIVER'),
      ctrl('b', 'REJECTED_BY_DRIVER'),
      ctrl('c', 'PENDING_DRIVER_APPROVAL'),
      ctrl('d', 'REJECTED_BY_DRIVER'),
    ];
    expect(sortRejectedFirst(controls).map((c) => c.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('does not mutate the input', () => {
    const controls = [ctrl('a', 'ACCEPTED_BY_DRIVER'), ctrl('b', 'REJECTED_BY_DRIVER')];
    sortRejectedFirst(controls);
    expect(controls.map((c) => c.id)).toEqual(['a', 'b']);
  });
});
