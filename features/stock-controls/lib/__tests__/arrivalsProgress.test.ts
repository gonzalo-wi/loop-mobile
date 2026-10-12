import { getArrivalsProgress } from '../arrivalsProgress';

const data = (totalExpected: number, arrived: number) => ({
  totalExpected,
  arrived,
  pending: totalExpected - arrived,
});

describe('getArrivalsProgress', () => {
  it('is empty when no route went out today (no "100% completado" with 0 of 0)', () => {
    expect(getArrivalsProgress(data(0, 0))).toEqual({ state: 'empty', percent: 0 });
  });

  it('is in progress while some routes are still out', () => {
    expect(getArrivalsProgress(data(8, 3))).toEqual({ state: 'inProgress', percent: 38 });
  });

  it('is done when every route arrived', () => {
    expect(getArrivalsProgress(data(5, 5))).toEqual({ state: 'allArrived', percent: 100 });
  });

  it('never goes above 100% even if the counts disagree', () => {
    expect(getArrivalsProgress({ totalExpected: 2, arrived: 3, pending: 0 }).percent).toBe(100);
  });

  it('rounds .5 up and other fractions to the nearest integer', () => {
    expect(getArrivalsProgress(data(200, 1)).percent).toBe(1); // 0.5 -> 1
    expect(getArrivalsProgress(data(8, 1)).percent).toBe(13); // 12.5 -> 13
    expect(getArrivalsProgress(data(3, 1)).percent).toBe(33);
    expect(getArrivalsProgress(data(3, 2)).percent).toBe(67);
  });

  it('is empty (not a negative percent) when totalExpected is negative', () => {
    expect(getArrivalsProgress({ totalExpected: -3, arrived: 0, pending: 0 })).toEqual({ state: 'empty', percent: 0 });
    expect(getArrivalsProgress({ totalExpected: -3, arrived: 2, pending: 1 })).toEqual({ state: 'empty', percent: 0 });
  });

  it('keeps showing in progress when pending > 0 even if arrived equals total', () => {
    expect(getArrivalsProgress({ totalExpected: 4, arrived: 4, pending: 1 })).toEqual({ state: 'inProgress', percent: 100 });
  });

  it('is allArrived when pending is 0 even if arrived is below total', () => {
    expect(getArrivalsProgress({ totalExpected: 4, arrived: 2, pending: 0 })).toEqual({ state: 'allArrived', percent: 50 });
  });

  it('is allArrived when pending is negative', () => {
    expect(getArrivalsProgress({ totalExpected: 4, arrived: 5, pending: -1 })).toEqual({ state: 'allArrived', percent: 100 });
  });

  it('never returns a negative percent when arrived is negative', () => {
    expect(getArrivalsProgress({ totalExpected: 4, arrived: -1, pending: 5 }).percent).toBeGreaterThanOrEqual(0);
  });
});
