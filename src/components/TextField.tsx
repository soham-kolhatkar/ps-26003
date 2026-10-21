import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/AppText';
import { useSettings } from '@/store/settings';
import { fontFamily } from '@/theme/fonts';
import { colors, font, radius, space, touch } from '@/theme/tokens';

type TextFieldProps = TextInputProps & { label: string };

export function TextField({ label, style, ...rest }: TextFieldProps) {
  const language = useSettings((s) => s.language);
  return (
    <View style={styles.wrap}>
      <AppText variant="small" bold>
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { fontFamily: fontFamily(language, 'regular') }, style]}
        maxFontSizeMultiplier={1.6}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  input: {
    minHeight: touch.min,
    borderWidth: 2,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    fontSize: font.size.large,
    color: colors.text,
  },
});
