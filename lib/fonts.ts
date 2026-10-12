/**
 * Plus Jakarta Sans, bundled in assets/fonts. Android does not synthesize
 * weights for custom families, so each weight is its own family name and
 * styles pick it through `font(weight)` instead of `fontWeight`.
 */

export const FONT_FAMILY = {
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extra: 'PlusJakartaSans_800ExtraBold',
} as const;

export type FontWeightName = keyof typeof FONT_FAMILY;

/** Text style fragment for a weight of the app font. */
export function font(weight: FontWeightName): { fontFamily: string } {
  return { fontFamily: FONT_FAMILY[weight] };
}
