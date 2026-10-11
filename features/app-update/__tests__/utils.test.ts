import { formatVersionLabel } from '../utils';

describe('formatVersionLabel', () => {
  it('shows the installed version', () => {
    expect(formatVersionLabel('1.2.3')).toBe('LOOP v1.2.3');
  });

  it('omits the version when it cannot be read', () => {
    expect(formatVersionLabel(null)).toBe('LOOP');
  });
});
