import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/PressableScale';
import { colors, radius, shadow, space, touch } from '@/theme/tokens';

type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
  testID?: string;
};

/** A white surface on the ground with a soft shadow (no border). Groups things; tappable when `onPress`. */
export function Card({ children, onPress, accessibilityLabel, style, testID }: CardProps) {
  if (!onPress)
    return (
      <View style={[styles.card, style]} testID={testID}>
        {children}
      </View>
    );
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.card, styles.pressable, pressed && styles.pressed, style]}
    >
      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
    boxShadow: shadow.card,
  },
  pressable: { minHeight: touch.min },
  pressed: { backgroundColor: colors.primaryWash },
});
