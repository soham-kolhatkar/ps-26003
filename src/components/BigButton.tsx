import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale, type PressableScaleProps } from '@/components/PressableScale';
import { colors, radius, space, touch } from '@/theme/tokens';

/**
 * primary = the one filled main action on a screen; secondary = tonal (leaf, no outline);
 * ghost = plain text button for minor actions.
 */
type Kind = 'primary' | 'secondary' | 'ghost';

export type BigButtonProps = Omit<PressableScaleProps, 'children' | 'style'> & {
  label: string;
  icon?: IconName;
  kind?: Kind;
  size?: 'regular' | 'large';
  selected?: boolean;
};

const FG: Record<Kind, string> = {
  primary: colors.textOnPrimary,
  secondary: colors.onPrimarySoft,
  ghost: colors.primary,
};
const TONE = { primary: 'onPrimary', secondary: 'onPrimarySoft', ghost: 'primary' } as const;

export function BigButton({
  label,
  icon,
  kind = 'primary',
  size = 'regular',
  selected,
  disabled,
  ...rest
}: BigButtonProps) {
  const large = size === 'large';
  const fg = selected ? colors.onPrimarySoft : FG[kind];
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: !!selected }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        large ? styles.large : styles.regular,
        styles[kind],
        selected && styles.selected,
        pressed && PRESSED[kind],
        disabled && styles.disabled,
      ]}
      {...rest}
    >
      <View style={styles.content}>
        {icon ? <Icon name={icon} size={large ? 30 : 24} color={fg} /> : null}
        <AppText
          variant={large ? 'large' : 'body'}
          weight={large ? 'bold' : 'semibold'}
          tone={selected ? 'onPrimarySoft' : TONE[kind]}
          center
        >
          {label}
        </AppText>
      </View>
    </PressableScale>
  );
}

const PRESSED = StyleSheet.create({
  primary: { backgroundColor: colors.primaryPressed },
  secondary: { backgroundColor: '#CBE4D8' },
  ghost: { backgroundColor: colors.primaryWash },
});

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 4,
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  regular: { minHeight: touch.min, borderRadius: radius.md },
  large: { minHeight: touch.large, borderRadius: radius.lg },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm + 4 },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.primarySoft },
  ghost: { backgroundColor: 'transparent' },
  selected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  disabled: { opacity: 0.45 },
});
