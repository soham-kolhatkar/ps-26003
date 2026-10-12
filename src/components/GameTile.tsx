import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radius, space, touch } from '@/theme/tokens';

type GameTileProps = {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
};

/** Large, single-tap game entry on the patient home. */
export function GameTile({ icon, title, description, onPress }: GameTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <AppText style={styles.emoji} importantForAccessibility="no">
          {icon}
        </AppText>
      </View>
      <View style={styles.text}>
        <AppText variant="large" bold>
          {title}
        </AppText>
        <AppText variant="small" tone="muted">
          {description}
        </AppText>
      </View>
      <AppText variant="title" tone="primary" importantForAccessibility="no">
        ▶
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: touch.large + space.lg,
    padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  pressed: { backgroundColor: colors.primarySoft },
  icon: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 44, lineHeight: 54 },
  text: { flex: 1, gap: 2 },
});
