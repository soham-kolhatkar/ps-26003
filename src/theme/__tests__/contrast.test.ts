import { chart, colors } from '@/theme/tokens';

/** WCAG 2.x relative luminance and contrast ratio. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('palette contrast (D50: 7:1 text for ageing eyes)', () => {
  it.each([
    ['text on ground', colors.text, colors.background],
    ['text on surface', colors.text, colors.surface],
    ['muted text on ground', colors.textMuted, colors.background],
    ['muted text on surface', colors.textMuted, colors.surface],
    ['white on primary', colors.textOnPrimary, colors.primary],
    ['white on primary (pressed)', colors.textOnPrimary, colors.primaryPressed],
    ['primary text on ground', colors.primary, colors.background],
    ['tonal button label', colors.onPrimarySoft, colors.primarySoft],
    ['reminder text on clay', colors.onClay, colors.clay],
  ])('%s ≥ 7:1', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(7);
  });

  it.each([
    ['urgent on white', colors.danger, colors.surface],
    ['urgent on its tint', colors.danger, colors.accentSoft],
    ['soon on white', colors.warning, colors.surface],
    ['soon on its tint', colors.warning, colors.warningSoft],
    ['well on white', colors.success, colors.surface],
    ['well on its tint', colors.success, colors.successSoft],
  ])('status %s ≥ 4.5:1 (always with a shape and a word)', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('text fields and chart marks are visible (≥ 3:1, WCAG 1.4.11)', () => {
    expect(contrast(colors.inputBorder, colors.surface)).toBeGreaterThanOrEqual(3);
    expect(contrast(chart.series, chart.surface)).toBeGreaterThanOrEqual(3);
  });
});
