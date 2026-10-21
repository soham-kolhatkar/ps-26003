import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { Picture } from '@/components/Picture';
import { PressableScale } from '@/components/PressableScale';
import { colors, radius, shadow, space } from '@/theme/tokens';

type GameTileProps = {
  icon: string;
  title: string;
  /** Read out as the hint; not printed (less to read on the tile). */
  description: string;
  /** Soft colour behind the picture (decorative). */
  tint?: string;
  onPress: () => void;
};

/** Large, single-tap game entry: picture, name, play button. */
export function GameTile({ icon, title, description, tint = colors.tint.leaf, onPress }: GameTileProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={[styles.picture, { backgroundColor: tint }]}>
        <Picture glyph={icon} size={48} />
      </View>
      <AppText variant="large" bold style={styles.title}>
        {title}
      </AppText>
      <View style={styles.play}>
        <Icon name="play" size={22} color={colors.textOnPrimary} weight="fill" />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 88,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 4,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    boxShadow: shadow.card,
  },
  pressed: { backgroundColor: colors.primaryWash },
  picture: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1 },
  play: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
