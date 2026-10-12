import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
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
      <AppText variant="small" tone="muted">
        🔒 {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'center',
    minHeight: touch.min,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
});
