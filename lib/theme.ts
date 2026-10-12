/**
 * Design system — LOOP (loop-rediseno/DESIGN.md).
 * Light UI meant to be read under direct sunlight: cream background, navy
 * ink, solid color blocks and heavy, very rounded shapes.
 *
 * The legacy keys (primary, exit, entry, textMuted…) are kept and remapped to
 * the LOOP palette so screens that have not been redesigned yet stay coherent.
 */

const palette = {
  cream: '#F2F0EA',
  white: '#FFFFFF',
  navy: '#121C4E',
  ink2: '#4D5578',
  ink2OnGreen: '#1F2B4F',
  blue: '#2456E6',
  blueText: '#1E46C8',
  blueLight: '#DCE5FF',
  green: '#8FD45A',
  greenSoft: '#DDF2CB',
  greenDot: '#3C8A1E',
  orange: '#F08A00',
  orangeSoft: '#FFE9C7',
  orangeText: '#8A4B00',
  red: '#C8322B',
  redSoft: '#FCE4E1',
  redText: '#A3271F',
  odoo: '#714B67',
  line: '#ECE9E0',
  handle: '#D5D2C8',
  scrim: 'rgba(18,28,78,0.55)',
  pillOnBlue: 'rgba(8,18,84,0.34)',
  pillOnGreen: 'rgba(18,28,78,0.16)',
  cameraScrim: 'rgba(4,6,16,0.6)',
};

export const C = {
  ...palette,

  // Surfaces
  bg: palette.cream,
  surface: palette.white,
  surfaceAlt: palette.cream,
  surfaceSunken: palette.cream,

  // Brand
  primary: palette.blue,
  primaryDark: palette.navy,
  primaryLight: palette.blueLight,
  primaryGlow: palette.blue,

  // Headers
  headerFrom: palette.navy,
  headerTo: palette.navy,
  onHeader: palette.white,
  onHeaderMuted: palette.blueLight,

  // Direction: blue = goes out / up, green = comes in / down.
  exit: palette.blue,
  exitLight: palette.blueLight,
  exitFrom: palette.blue,
  exitTo: palette.blue,
  // The block green (#8FD45A) fails contrast as text or under white text, so
  // legacy usages (icons, labels, white-on-fill) get the darker dot green.
  entry: palette.greenDot,
  entryLight: palette.greenSoft,
  entryFrom: palette.greenDot,
  entryTo: palette.greenDot,

  // Status
  danger: palette.red,
  dangerLight: palette.redSoft,
  warning: palette.orange,
  warningLight: palette.orangeSoft,
  warningBorder: palette.orange,
  success: palette.greenDot,
  successLight: palette.greenSoft,
  accent: palette.blue,
  accentLight: palette.blueLight,

  // Supervisor override has no LOOP equivalent yet; kept until it gets a mockup.
  supervisor: '#6D28D9',
  supervisorLight: '#EDE4FC',
  supervisorDark: '#5321A8',

  // Odoo
  odooLight: '#F1E8EE',
  odooBorder: '#DCC8D6',

  // Text: the spec defines only two ink levels to keep 4.5:1 contrast.
  text: palette.navy,
  textStrong: palette.navy,
  textSub: palette.ink2,
  textMuted: palette.ink2,
  textFaint: '#8A8FA6',

  // Borders / inputs (cards carry no border in LOOP; these are inner dividers)
  border: palette.line,
  borderStrong: palette.handle,
  inputBg: palette.cream,

  retornableBorder: palette.blue,
  descartableBorder: palette.orange,
};

/** Spacing scale (multiples of 4). */
export const S = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
  /** Horizontal screen margin. */
  gutter: 16,
  /** Horizontal margin on Login and Home. */
  gutterWide: 20,
};

/** Border radii. */
export const R = {
  xs: 6,
  sm: 8,
  md: 14,
  lg: 22,
  xl: 28,
  xxl: 32,
  full: 999,
  block: 32,
  card: 28,
  row: 22,
  field: 22,
  cell: 14,
  sheet: 32,
};

/** Component heights; 44 is the minimum touch target. */
export const H = {
  touch: 44,
  primaryButton: 60,
  secondaryButton: 54,
  circleButton: 48,
  circleButtonLarge: 60,
  pill: 44,
  field: 60,
  row: 64,
  statusCell: 36,
  icon: 24,
  iconInPill: 20,
};

/** Font sizes. */
export const F = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  display: 28,
};

/** Font weights. */
export const W = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extra: '800',
} as const;

/** Type scale from DESIGN.md §2; letterSpacing converted from em to pt. */
export const T = {
  display: { fontSize: 40, lineHeight: 44, fontWeight: W.extra, letterSpacing: -1.4 },
  blockTitle: { fontSize: 30, lineHeight: 36, fontWeight: W.extra, letterSpacing: -0.9 },
  sheetTitle: { fontSize: 26, lineHeight: 32, fontWeight: W.extra, letterSpacing: -0.78 },
  tabTitle: { fontSize: 32, lineHeight: 38, fontWeight: W.extra, letterSpacing: -0.96 },
  screenTitle: { fontSize: 22, lineHeight: 28, fontWeight: W.extra, letterSpacing: -0.44 },
  section: { fontSize: 18, lineHeight: 24, fontWeight: W.extra, letterSpacing: -0.18 },
  button: { fontSize: 17, lineHeight: 22, fontWeight: W.extra },
  data: { fontSize: 16, lineHeight: 22, fontWeight: W.extra, letterSpacing: 0.16 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: W.medium },
  label: { fontSize: 14, lineHeight: 20, fontWeight: W.bold },
  secondary: { fontSize: 13, lineHeight: 18, fontWeight: W.semibold },
  systemTag: { fontSize: 11, lineHeight: 14, fontWeight: W.extra, letterSpacing: 0.66 },
} as const;

/** Shadows. LOOP only shadows floating elements; cards and rows stay flat. */
export const Shdw = {
  xs: {
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  float: {
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  header: {
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  brand: {
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  // RN has no negative spread, so the mockup's -12/-14px spread is
  // approximated with lower opacity.
  primaryButton: {
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  floatingWhite: {
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  tabBar: {
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 10,
  },
};
