/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { useLoadTimer } from '../useLoadTimer';

function setup(initialCount: number) {
  let current = 0;
  const now = jest.fn(() => current);
  const hook = renderHook(({ count }) => useLoadTimer(count, now), { initialProps: { count: initialCount } });
  return {
    ...hook,
    at: (ms: number) => {
      current = ms;
    },
  };
}

describe('useLoadTimer', () => {
  it('has no duration while the form is empty', () => {
    const { result } = setup(0);

    expect(result.current.elapsedSeconds()).toBeUndefined();
  });

  it('starts when the first serial is added and measures from then', () => {
    const { result, rerender, at } = setup(0);

    at(10_000);
    rerender({ count: 1 });
    at(70_000);

    expect(result.current.elapsedSeconds()).toBe(60);
  });

  it('keeps the original start across re-renders, more serials and a failed submit', () => {
    const { result, rerender, at } = setup(0);
    at(10_000);
    rerender({ count: 1 });

    at(30_000);
    rerender({ count: 3 });
    rerender({ count: 2 });
    at(40_000);
    expect(result.current.elapsedSeconds()).toBe(30);

    // A failed submit keeps the serials, so the same count is rendered again.
    at(100_000);
    rerender({ count: 2 });
    expect(result.current.elapsedSeconds()).toBe(90);
  });

  it('resets when the count goes to zero and starts over with the next serial', () => {
    const { result, rerender, at } = setup(0);
    at(10_000);
    rerender({ count: 1 });

    at(50_000);
    rerender({ count: 0 });
    expect(result.current.elapsedSeconds()).toBeUndefined();

    at(80_000);
    rerender({ count: 1 });
    at(95_000);
    expect(result.current.elapsedSeconds()).toBe(15);
  });

  it('starts right away when mounted with serials already in the list', () => {
    const { result, at } = setup(2);
    at(20_000);

    expect(result.current.elapsedSeconds()).toBe(20);
  });

  it('does not re-render the host when serials are added or the start changes', () => {
    let renders = 0;
    let current = 0;
    const now = () => current;
    const { rerender } = renderHook(
      ({ count }) => {
        renders += 1;
        return useLoadTimer(count, now);
      },
      { initialProps: { count: 0 } },
    );
    const afterMount = renders;

    current = 5_000;
    rerender({ count: 1 });
    // Only the render caused by the rerender itself; the hook adds none of its own.
    expect(renders).toBe(afterMount + 1);

    rerender({ count: 0 });
    expect(renders).toBe(afterMount + 2);
  });

  it('returns a stable elapsedSeconds callback across renders', () => {
    const { result, rerender } = setup(0);
    const first = result.current.elapsedSeconds;

    rerender({ count: 2 });

    expect(result.current.elapsedSeconds).toBe(first);
  });

  it('rounds down to whole seconds', () => {
    const { result, rerender, at } = setup(0);
    at(1_000);
    rerender({ count: 1 });
    at(3_999);

    expect(result.current.elapsedSeconds()).toBe(2);
  });

  it('is 0 when the clock goes backwards', () => {
    const { result, rerender, at } = setup(0);
    at(50_000);
    rerender({ count: 1 });
    at(20_000);

    expect(result.current.elapsedSeconds()).toBe(0);
  });
});
