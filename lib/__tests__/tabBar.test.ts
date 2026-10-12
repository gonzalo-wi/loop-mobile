import { TAB_BAR_HEIGHT, TAB_BAR_MARGIN, isTabHidden, tabBarClearance, visibleBadge } from '../tabBar';

describe('tabBarClearance', () => {
  it('equals bar height plus margin with no inset', () => {
    expect(tabBarClearance(0)).toBe(TAB_BAR_HEIGHT + TAB_BAR_MARGIN);
  });

  it('adds the bottom safe area inset', () => {
    expect(tabBarClearance(34)).toBe(TAB_BAR_HEIGHT + TAB_BAR_MARGIN + 34);
  });
});

describe('isTabHidden', () => {
  it('hides tabs expo-router marked with display none (href: null)', () => {
    expect(isTabHidden({ tabBarItemStyle: { display: 'none' } })).toBe(true);
  });

  it('shows tabs without item style or with another display', () => {
    expect(isTabHidden({})).toBe(false);
    expect(isTabHidden({ tabBarItemStyle: { display: 'flex' } })).toBe(false);
  });

  it('resolves style arrays with the last display winning', () => {
    expect(isTabHidden({ tabBarItemStyle: [{ display: 'none' }, { padding: 4 }] })).toBe(true);
    expect(isTabHidden({ tabBarItemStyle: [{ display: 'none' }, { display: 'flex' }] })).toBe(false);
    expect(isTabHidden({ tabBarItemStyle: [null, [{ display: 'none' }]] })).toBe(true);
  });
});

describe('visibleBadge', () => {
  it('hides empty badges like React Navigation does', () => {
    expect(visibleBadge(undefined)).toBeNull();
    expect(visibleBadge(0)).toBeNull();
    expect(visibleBadge('')).toBeNull();
  });

  it('stringifies non-empty badges', () => {
    expect(visibleBadge(3)).toBe('3');
    expect(visibleBadge('!')).toBe('!');
  });
});
