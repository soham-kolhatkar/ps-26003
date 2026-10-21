import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { colors, radius, space, touch } from '@/theme/tokens';

type HoldButtonProps = {
  label: string;
  hint: string;
  onHold: () => void;
  holdMs?: number;
};

/**
 * A deliberately "hard to press by accident" control: requires a long press.
 * Used for exiting patient mode so a patient can't leave by mistake.
 */
export function HoldButton({ label, hint, onHold, holdMs = 2000 }: HoldButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      delayLongPress={holdMs}
      onLongPress={onHold}
      style={({ pressed }) => [styles.base, pressed && styles.pressed]}
    >
      <Icon name="lock" size={20} color={colors.textMuted} />
      <AppText variant="small" tone="muted" style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'center',
    minHeight: touch.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  label: { flexShrink: 1 },
});
