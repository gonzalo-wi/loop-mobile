/**
 * Sistema de diseño — Control de Mercadería
 * Línea visual: SaaS operativo / logístico. Azul de marca con carácter,
 * grises slate modernos, acentos para estados. Mobile-first.
 */

export const C = {
  // Superficies / fondos
  bg: '#EEF2F9',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F9FD',
  surfaceSunken: '#F1F4FA',

  // Azul de marca (royal, con carácter — no el azul puro genérico)
  primary: '#2B50E0',
  primaryDark: '#1E3BB0',
  primaryLight: '#E9EEFF',
  primaryGlow: '#5B7BFF',

  // Headers
  headerFrom: '#3A5DEA',
  headerTo: '#1E3BB0',
  onHeader: '#FFFFFF',
  onHeaderMuted: '#C2D0FB',

  // Tipos de control
  exit: '#2B50E0',
  exitLight: '#E9EEFF',
  exitFrom: '#3A5DEA',
  exitTo: '#1E3BB0',
  entry: '#0FA968',
  entryLight: '#DCF5EA',
  entryFrom: '#12B873',
  entryTo: '#0B7E4E',

  // Estados
  danger: '#E5484D',
  dangerLight: '#FDECEC',
  warning: '#E8870B',
  warningLight: '#FDF1DC',
  warningBorder: '#F6D9A8',
  success: '#0FA968',
  successLight: '#DCF5EA',
  accent: '#0EA5C4',
  accentLight: '#DDF4F9',

  // Acción de supervisor (corrección/override con auditoría — distinta de
  // "warning", que es para alertas). Morado, coherente con SENT_TO_AGUAS.
  supervisor: '#6D28D9',
  supervisorLight: '#EDE4FC',
  supervisorDark: '#5321A8',

  // Integración Odoo (ERP externo, distinto de Aguas). Morado-violeta propio
  // para no pisar `accent` (cian, ya usado en otras pantallas) ni confundirse
  // con `warning`/`danger` de los estados de validación.
  odoo: '#8B5CF6',
  odooLight: '#F0EAFE',
  odooBorder: '#DCCCFB',

  // Texto (escala slate)
  text: '#0E1726',
  textStrong: '#0A111E',
  textSub: '#46546B',
  textMuted: '#8593A8',
  textFaint: '#AAB4C5',

  // Bordes / inputs
  border: '#E2E8F1',
  borderStrong: '#D2DAE6',
  inputBg: '#F1F4FA',

  retornableBorder: '#2B50E0',
  descartableBorder: '#E8870B',
};

/** Escala de espaciado (múltiplos de 4). */
export const S = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

/** Radios de borde. */
export const R = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 28,
  full: 999,
};

/** Tamaños de fuente. */
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

/** Pesos tipográficos. */
export const W = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extra: '800',
} as const;

/** Sombras realistas (tinte azulado para coherencia). */
export const Shdw = {
  xs: {
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  card: {
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  float: {
    shadowColor: '#172554',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 20,
    elevation: 7,
  },
  header: {
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  brand: {
    shadowColor: '#2B50E0',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 22,
    elevation: 10,
  },
};
