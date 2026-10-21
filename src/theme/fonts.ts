import { NotoSansDevanagari_400Regular } from '@expo-google-fonts/noto-sans-devanagari/400Regular';
import { NotoSansDevanagari_600SemiBold } from '@expo-google-fonts/noto-sans-devanagari/600SemiBold';
import { NotoSansDevanagari_700Bold } from '@expo-google-fonts/noto-sans-devanagari/700Bold';

import type { LanguageCode } from '@/i18n';

/**
 * One font family per script and weight (D50). Loaded with `useFonts` in the root
 * layout (works in Expo Go, the APK and on web). Each weight is its own family:
 * Android fakes bold when `fontWeight` is set on a single-weight family.
 * Noto Sans Devanagari carries Noto Sans Latin too, so English and Hindi share one
 * design (mixed lines match) and one download. Not Atkinson Hyperlegible: its
 * slashed zero ("1Ø:ØØ") is unfamiliar on clock times and doses. A Bengali-script
 * family (Noto Sans Bengali) joins for Assamese (F25).
 */
export const FONT_SOURCES = {
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_600SemiBold,
  NotoSansDevanagari_700Bold,
};

export type FontWeight = 'regular' | 'semibold' | 'bold';
export type Script = 'latin' | 'devanagari';

const FAMILY: Record<Script, Record<FontWeight, keyof typeof FONT_SOURCES>> = {
  latin: {
    regular: 'NotoSansDevanagari_400Regular',
    semibold: 'NotoSansDevanagari_600SemiBold',
    bold: 'NotoSansDevanagari_700Bold',
  },
  devanagari: {
    regular: 'NotoSansDevanagari_400Regular',
    semibold: 'NotoSansDevanagari_600SemiBold',
    bold: 'NotoSansDevanagari_700Bold',
  },
};

const SCRIPT: Record<LanguageCode, Script> = { en: 'latin', hi: 'devanagari' };

export function scriptFor(language: LanguageCode): Script {
  return SCRIPT[language] ?? 'latin';
}

export function fontFamily(language: LanguageCode, weight: FontWeight): string {
  return FAMILY[scriptFor(language)][weight];
}

/**
 * Line height as a multiple of the font size. Devanagari stacks matras above and
 * below the line, so it needs more room than Latin or it clips on Android.
 */
export function lineHeightFactor(script: Script, display: boolean): number {
  if (script === 'devanagari') return display ? 1.45 : 1.6;
  return display ? 1.25 : 1.45;
}
