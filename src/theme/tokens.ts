/**
 * Elder-friendly design tokens.
 * - Large type (body >= 22sp), high contrast, warm palette drawn from Assam
 *   tea gardens (green) and the gamosa (cream + red border).
 * - Every tappable element is at least `touch.min` tall.
 */
export const colors = {
  background: '#FFF8EE',
  surface: '#FFFFFF',
  surfaceMuted: '#F3EBDD',
  border: '#E2D6C3',

  text: '#1A1A1A',
  textMuted: '#55504A',
  textOnPrimary: '#FFFFFF',

  primary: '#1E6B52',
  primaryPressed: '#16523F',
  primarySoft: '#DCEFE7',

  accent: '#B3261E',
  accentSoft: '#F9DEDC',

  success: '#2E7D32',
  successSoft: '#E3F2E4',
  warning: '#B26A00',
  warningSoft: '#FFF0D6',
  danger: '#B3261E',
} as const;

/**
 * Chart tokens. The brand green reads gray as a data mark (fails the dataviz
 * chroma floor), so marks use a more chromatic tea-green validated against
 * the white card surface. Text never wears the series color.
 */
export const chart = {
  series: '#13805A',
  seriesWash: 'rgba(19, 128, 90, 0.10)',
  deemphasis: '#B9B1A4',
  grid: '#ECE5D8',
  axisText: colors.textMuted,
  surface: colors.surface,
} as const;

export const font = {
  /** Sizes in sp. Patient-facing screens should not go below `body`. */
  size: {
    caption: 16,
    small: 18,
    body: 22,
    large: 26,
    title: 32,
    hero: 44,
  },
  weight: {
    regular: '400',
    medium: '500',
    bold: '700',
  },
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const touch = {
  /** Minimum height for any tappable control. */
  min: 64,
  /** Primary patient actions. */
  large: 88,
} as const;

export const theme = { colors, chart, font, space, radius, touch } as const;
export type Theme = typeof theme;
