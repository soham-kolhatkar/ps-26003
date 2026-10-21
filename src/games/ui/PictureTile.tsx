import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { Picture } from '@/components/Picture';
import { PressableScale } from '@/components/PressableScale';
import { colors, radius, shadow, space } from '@/theme/tokens';

/**
 * idle; hint = "this one" (a green ring, never amber or red); solved = green with a tick;
 * dimmed = a wrong tap fades, nothing else happens (errorless, D50).
 */
export type TileState = 'idle' | 'hint' | 'solved' | 'dimmed';

type PictureTileProps = {
  glyph: string;
  /** Spoken name; also printed under the picture when `showLabel`. */
  label: string;
  showLabel?: boolean;
  /** Side of the square tile in dp (from the Board). */
  size: number;
  state?: TileState;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
};

export function PictureTile({
  glyph,
  label,
  showLabel,
  size,
  state = 'idle',
  onPress,
  disabled,
  testID,
}: PictureTileProps) {
  const picture = Math.round(size * (showLabel ? 0.5 : 0.62));
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: state === 'solved', disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      style={({ pressed }) => [
        styles.tile,
        { width: size, height: size, borderRadius: Math.min(radius.lg, size * 0.18) },
        pressed && styles.pressed,
        state === 'hint' && styles.hint,
        state === 'solved' && styles.solved,
        state === 'dimmed' && styles.dimmed,
      ]}
    >
      <Picture glyph={glyph} size={picture} />
      {showLabel ? (
        <AppText
          variant="small"
          weight={state === 'solved' ? 'bold' : 'semibold'}
          center
          numberOfLines={2}
          style={styles.label}
        >
          {label}
        </AppText>
      ) : null}
      {state === 'solved' ? (
        <View style={styles.badge}>
          <Icon name="check" size={22} weight="bold" color={colors.textOnPrimary} />
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    padding: space.xs,
    backgroundColor: colors.surface,
    borderWidth: 4,
    borderColor: 'transparent',
    boxShadow: shadow.card,
  },
  pressed: { backgroundColor: colors.primaryWash },
  hint: { borderColor: colors.primary, backgroundColor: colors.primaryWash },
  solved: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  dimmed: { opacity: 0.4 },
  label: { paddingHorizontal: space.xs },
  badge: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
