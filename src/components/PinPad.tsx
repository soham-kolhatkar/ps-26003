import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { colors, radius, shadow, space, touch } from '@/theme/tokens';

type PinPadProps = {
  length: number;
  value: string;
  onChange: (value: string) => void;
  deleteLabel: string;
  disabled?: boolean;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

/** Large on-screen number pad with dot indicators (no system keyboard). */
export function PinPad({ length, value, onChange, deleteLabel, disabled }: PinPadProps) {
  const press = (key: (typeof KEYS)[number]) => {
    if (disabled) return;
    if (key === 'del') onChange(value.slice(0, -1));
    else if (value.length < length) onChange(value + key);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.dots} accessibilityLabel={`${value.length} / ${length}`}>
        {Array.from({ length }, (_, i) => (
          <View key={i} style={[styles.dot, i < value.length && styles.dotFilled]} />
        ))}
      </View>
      <View style={styles.grid}>
        {KEYS.map((key, i) =>
          key === '' ? (
            <View key={i} style={styles.key} />
          ) : (
            <PressableScale
              key={i}
              accessibilityRole="button"
              accessibilityLabel={key === 'del' ? deleteLabel : key}
              onPress={() => press(key)}
              style={({ pressed }) => [
                styles.key,
                key === 'del' ? styles.delButton : styles.keyButton,
                pressed && styles.keyPressed,
              ]}
            >
              {key === 'del' ? (
                <Icon name="backspace" size={32} color={colors.onPrimarySoft} />
              ) : (
                <AppText variant="title" tone="default">
                  {key}
                </AppText>
              )}
            </PressableScale>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xl, alignItems: 'center' },
  dots: { flexDirection: 'row', gap: space.lg },
  dot: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  dotFilled: { backgroundColor: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 3 * 96 + 2 * space.md, gap: space.md },
  key: { width: 96, height: touch.large, alignItems: 'center', justifyContent: 'center' },
  keyButton: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    boxShadow: shadow.card,
  },
  delButton: { borderRadius: radius.md, backgroundColor: colors.primarySoft },
  keyPressed: { backgroundColor: colors.primarySoft },
});
