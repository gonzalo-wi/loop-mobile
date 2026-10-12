export const TAB_BAR_HEIGHT = 72;
/** Gap between the floating tab bar and the bottom safe area. */
export const TAB_BAR_MARGIN = 20;

/** Space a tab screen must leave at the bottom so nothing hides under the floating bar. */
export function tabBarClearance(bottomInset: number): number {
  return TAB_BAR_HEIGHT + TAB_BAR_MARGIN + bottomInset;
}

type StyleLike = unknown;

function hasDisplayNone(style: StyleLike): boolean {
  if (Array.isArray(style)) {
    // Later entries win, same as StyleSheet.flatten.
    for (let i = style.length - 1; i >= 0; i--) {
      const item: unknown = style[i];
      if (item && typeof item === 'object' && !Array.isArray(item) && 'display' in item) {
        return (item as { display?: unknown }).display === 'none';
      }
      if (Array.isArray(item)) return hasDisplayNone(item);
    }
    return false;
  }
  return !!style && typeof style === 'object' && (style as { display?: unknown }).display === 'none';
}

/**
 * expo-router strips `href` from tab options and turns `href: null` into
 * `tabBarItemStyle: { display: 'none' }`, so that is what marks a hidden tab.
 */
export function isTabHidden(options: { tabBarItemStyle?: StyleLike }): boolean {
  return hasDisplayNone(options.tabBarItemStyle);
}

/** Badge text to show, or null when React Navigation would hide it (undefined, 0 or ''). */
export function visibleBadge(badge: string | number | undefined): string | null {
  if (badge === undefined || badge === 0 || badge === '') return null;
  return String(badge);
}
