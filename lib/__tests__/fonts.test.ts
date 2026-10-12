import { FONT_FAMILY, font } from '../fonts';
import { T } from '../theme';

describe('font', () => {
  it('maps every weight name to its own family', () => {
    expect(font('medium')).toEqual({ fontFamily: 'PlusJakartaSans_500Medium' });
    expect(font('semibold')).toEqual({ fontFamily: 'PlusJakartaSans_600SemiBold' });
    expect(font('bold')).toEqual({ fontFamily: 'PlusJakartaSans_700Bold' });
    expect(font('extra')).toEqual({ fontFamily: 'PlusJakartaSans_800ExtraBold' });
  });

  it('uses a distinct family per weight', () => {
    const families = Object.values(FONT_FAMILY);
    expect(new Set(families).size).toBe(families.length);
  });
});

describe('type scale', () => {
  const families = new Set<string>(Object.values(FONT_FAMILY));

  it.each(Object.entries(T))('%s uses a bundled font family', (_name, style) => {
    expect(families.has(style.fontFamily)).toBe(true);
  });

  it.each(Object.entries(T))('%s has a line height not smaller than its font size', (_name, style) => {
    expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize);
  });
});
