import { elapsedSeconds, nextStartedAt } from '../loadTimer';

describe('nextStartedAt', () => {
  it('starts when the first serial is added to an empty form', () => {
    expect(nextStartedAt(null, 1, 5000)).toBe(5000);
  });

  it('keeps the start while more serials are added or some are removed', () => {
    expect(nextStartedAt(5000, 2, 9000)).toBe(5000);
    expect(nextStartedAt(5000, 1, 9000)).toBe(5000);
  });

  it('stays not started while the form is empty', () => {
    expect(nextStartedAt(null, 0, 5000)).toBeNull();
  });

  it('resets when the list is empty again', () => {
    expect(nextStartedAt(5000, 0, 9000)).toBeNull();
  });

  it('starts again after a reset', () => {
    const reset = nextStartedAt(5000, 0, 9000);
    expect(nextStartedAt(reset, 1, 12000)).toBe(12000);
  });

  it('can start at timestamp 0', () => {
    expect(nextStartedAt(null, 1, 0)).toBe(0);
    expect(nextStartedAt(0, 3, 4000)).toBe(0);
  });
});

describe('elapsedSeconds', () => {
  it('is undefined when not started', () => {
    expect(elapsedSeconds(null, 5000)).toBeUndefined();
  });

  it('counts whole seconds', () => {
    expect(elapsedSeconds(1000, 11000)).toBe(10);
  });

  it('rounds down', () => {
    expect(elapsedSeconds(1000, 1999)).toBe(0);
    expect(elapsedSeconds(1000, 11999)).toBe(10);
  });

  it('is 0 when the clock went backwards', () => {
    expect(elapsedSeconds(10000, 4000)).toBe(0);
  });
});
