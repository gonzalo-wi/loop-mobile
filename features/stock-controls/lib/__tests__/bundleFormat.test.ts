import { formatBundleSplit } from '../bundleFormat';

describe('formatBundleSplit', () => {
  it('splits units into bundles + loose units', () => {
    expect(formatBundleSplit(15, 6)).toBe('2 + 3');
  });

  it('keeps the loose part when it is zero', () => {
    expect(formatBundleSplit(12, 6)).toBe('2 + 0');
  });

  it('shows zero bundles when there are fewer units than a pack', () => {
    expect(formatBundleSplit(4, 6)).toBe('0 + 4');
  });

  it('shows plain units for products without bundles', () => {
    expect(formatBundleSplit(15, 1)).toBe('15');
  });

  it('shows plain units when the pack size is unknown', () => {
    expect(formatBundleSplit(15, undefined)).toBe('15');
  });
});
