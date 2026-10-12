import { FONT_FAMILY } from './fonts';

// Kept apart from fonts.ts so theme consumers (and Jest) never require the .ttf files.
export const FONT_ASSETS = {
  [FONT_FAMILY.medium]: require('../assets/fonts/PlusJakartaSans_500Medium.ttf'),
  [FONT_FAMILY.semibold]: require('../assets/fonts/PlusJakartaSans_600SemiBold.ttf'),
  [FONT_FAMILY.bold]: require('../assets/fonts/PlusJakartaSans_700Bold.ttf'),
  [FONT_FAMILY.extra]: require('../assets/fonts/PlusJakartaSans_800ExtraBold.ttf'),
};
