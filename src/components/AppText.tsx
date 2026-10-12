import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, font } from '@/theme/tokens';

type Variant = 'hero' | 'title' | 'large' | 'body' | 'small' | 'caption';
type Tone = 'default' | 'muted' | 'primary' | 'accent' | 'onPrimary';

export type AppTextProps = TextProps & {
  variant?: Variant;
  tone?: Tone;
  bold?: boolean;
  center?: boolean;
};

const toneColor: Record<Tone, string> = {
  default: colors.text,
  muted: colors.textMuted,
  primary: colors.primary,
  accent: colors.accent,
  onPrimary: colors.textOnPrimary,
};

export function AppText({
  variant = 'body',
  tone = 'default',
  bold,
  center,
  style,
  ...rest
}: AppTextProps) {
  return (
    <Text
      maxFontSizeMultiplier={1.6}
      style={[
        styles[variant],
        { color: toneColor[tone] },
        bold && styles.bold,
        center && styles.center,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  hero: { fontSize: font.size.hero, lineHeight: font.size.hero * 1.2, fontWeight: font.weight.bold },
  title: { fontSize: font.size.title, lineHeight: font.size.title * 1.25, fontWeight: font.weight.bold },
  large: { fontSize: font.size.large, lineHeight: font.size.large * 1.35 },
  body: { fontSize: font.size.body, lineHeight: font.size.body * 1.4 },
  small: { fontSize: font.size.small, lineHeight: font.size.small * 1.4 },
  caption: { fontSize: font.size.caption, lineHeight: font.size.caption * 1.4 },
  bold: { fontWeight: font.weight.bold },
  center: { textAlign: 'center' },
});
