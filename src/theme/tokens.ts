/**
 * Elder-friendly design tokens (Tier 4, D50; plan: docs/plans/tier4-ui-redesign.md).
 * - Warm off-white ground, white surfaces with a soft shadow instead of borders.
 * - One filled tea-green action per screen; second actions are tonal (leaf), never outlined.
 * - Text pairs reach 7:1 for ageing eyes (checked in theme/__tests__/contrast.test.ts).
 * - Red / amber / green status only on staff phones, always with a shape and a word.
 * - Every tappable element is at least `touch.min` tall.
 */
export const colors = {
  background: '#F8F4ED',
  surface: '#FFFFFF',
  /** Segmented controls, icon buttons, dividers, empty bars. */
  surfaceMuted: '#EFE9DF',
  /** Hairlines between rows. */
  border: '#DDD5C8',
  /** Text fields need a visible edge: 3.7:1 on white (WCAG 1.4.11). */
  inputBorder: '#8C857A',

  text: '#1C211E',
  textMuted: '#4B524D',
  textOnPrimary: '#FFFFFF',

  /** Tea green: the one main action on a screen. */
  primary: '#1A5E45',
  primaryPressed: '#134A36',
  /** Leaf: tonal second actions, selected states, highlights. */
  primarySoft: '#DDEEE6',
  onPrimarySoft: '#134A36',
  primaryWash: '#EAF5EF',

  /** Clay: reminders. */
  clay: '#FBE6DA',
  onClay: '#7E3412',

  /** Error text on staff and sign-in screens. Never on patient screens. */
  accent: '#B3261E',
  accentSoft: '#FBE4E1',

  success: '#2E6B34',
  successSoft: '#E3F0E3',
  warning: '#8A5300',
  warningSoft: '#FCEFD9',
  danger: '#B3261E',

  /** Behind pictures only (decorative, never carries meaning). */
  tint: {
    lilac: '#F1E7F3',
    sun: '#FBF0D9',
    pond: '#E1F0F1',
    leaf: '#E6EFE0',
    clay: '#FBE6DA',
  },

  /** "Catch the fish" pond (a pukhuri). */
  water: '#CFE8E6',
  waterLight: '#E4F3F1',
  waterEdge: '#8FC3BE',
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
    large: 24,
    title: 30,
    hero: 40,
  },
  weight: {
    regular: '400',
    semibold: '600',
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
  sm: 12,
  md: 20,
  lg: 26,
  pill: 999,
} as const;

export const touch = {
  /** Minimum height for any tappable control. */
  min: 64,
  /** Tonal / second actions on patient screens. */
  medium: 72,
  /** The main patient action (16–20 mm suits older hands). */
  large: 96,
} as const;

/** Soft elevation for white surfaces on the ground (no borders). */
export const shadow = {
  card: '0px 1px 2px rgba(28, 33, 30, 0.06), 0px 6px 16px rgba(28, 33, 30, 0.06)',
  raised: '0px 2px 4px rgba(28, 33, 30, 0.08), 0px 10px 24px rgba(28, 33, 30, 0.08)',
} as const;

/** Motion durations in ms (NN/g: 100 ms feedback, 200–400 ms changes). */
export const motion = {
  press: 120,
  release: 200,
  enter: 350,
  stagger: 70,
  celebrate: 2000,
} as const;

export const theme = { colors, chart, font, space, radius, touch, shadow, motion } as const;
export type Theme = typeof theme;
