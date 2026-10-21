import { StyleSheet, Text, type TextProps } from 'react-native';

import { useSettings } from '@/store/settings';
import { fontFamily, lineHeightFactor, scriptFor, type FontWeight } from '@/theme/fonts';
import { colors, font } from '@/theme/tokens';

type Variant = 'hero' | 'title' | 'large' | 'body' | 'small' | 'caption';
type Tone = 'default' | 'muted' | 'primary' | 'accent' | 'onPrimary' | 'onPrimarySoft' | 'onClay';

export type AppTextProps = TextProps & {
  variant?: Variant;
  tone?: Tone;
  /** Semibold. Titles and hero text are bold already. */
  bold?: boolean;
  weight?: FontWeight;
  center?: boolean;
};

const toneColor: Record<Tone, string> = {
  default: colors.text,
  muted: colors.textMuted,
  primary: colors.primary,
  accent: colors.accent,
  onPrimary: colors.textOnPrimary,
  onPrimarySoft: colors.onPrimarySoft,
  onClay: colors.onClay,
};

const DISPLAY: Record<Variant, boolean> = {
  hero: true,
  title: true,
  large: true,
  body: false,
  small: false,
  caption: false,
};

/** Text in the language's font (Noto Sans, Devanagari build), with room for matras. */
export function AppText({ variant = 'body', tone = 'default', bold, weight, center, style, ...rest }: AppTextProps) {
  const language = useSettings((s) => s.language);
  const resolved: FontWeight =
    weight ?? (DISPLAY[variant] && variant !== 'large' ? 'bold' : bold ? 'semibold' : 'regular');
  const size = font.size[variant];
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      style={[
        styles.base,
        {
          fontSize: size,
          lineHeight: Math.round(size * lineHeightFactor(scriptFor(language), DISPLAY[variant])),
          fontFamily: fontFamily(language, resolved),
          color: toneColor[tone],
        },
        center && styles.center,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: { includeFontPadding: true },
  center: { textAlign: 'center' },
});
