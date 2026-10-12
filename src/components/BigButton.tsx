import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radius, space, touch } from '@/theme/tokens';

type Kind = 'primary' | 'secondary' | 'ghost';

export type BigButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  /** Optional emoji/glyph shown before the label. */
  icon?: string;
  kind?: Kind;
  size?: 'regular' | 'large';
  selected?: boolean;
};

export function BigButton({
  label,
  icon,
  kind = 'primary',
  size = 'regular',
  selected,
  disabled,
  ...rest
}: BigButtonProps) {
  const isPrimary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: !!selected }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { minHeight: size === 'large' ? touch.large : touch.min },
        kind === 'primary' && styles.primary,
        kind === 'secondary' && styles.secondary,
        kind === 'ghost' && styles.ghost,
        selected && styles.selected,
        pressed && (isPrimary ? styles.primaryPressed : styles.pressed),
        disabled && styles.disabled,
      ]}
      {...rest}
    >
      <View style={styles.content}>
        {icon ? (
          <AppText variant={size === 'large' ? 'title' : 'large'} importantForAccessibility="no">
            {icon}
          </AppText>
        ) : null}
        <AppText variant={size === 'large' ? 'large' : 'body'} bold tone={isPrimary ? 'onPrimary' : 'primary'}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md },
  primary: { backgroundColor: colors.primary },
  primaryPressed: { backgroundColor: colors.primaryPressed },
  secondary: { backgroundColor: colors.surface, borderColor: colors.primary },
  ghost: { backgroundColor: 'transparent' },
  selected: { backgroundColor: colors.primarySoft, borderColor: colors.primary, borderWidth: 3 },
  pressed: { backgroundColor: colors.primarySoft },
  disabled: { opacity: 0.45 },
});
