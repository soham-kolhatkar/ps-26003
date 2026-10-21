import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { colors, radius, space, touch } from '@/theme/tokens';

/** Single-choice chip (tap to select). */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.chip, selected && styles.on]}
    >
      {selected ? <Icon name="check" size={20} color={colors.textOnPrimary} /> : null}
      <AppText variant="small" bold tone={selected ? 'onPrimary' : 'onPrimarySoft'} style={styles.label}>
        {label}
      </AppText>
    </PressableScale>
  );
}

/** A labelled row of chips for one choice. */
export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  labelFor,
}: {
  label: string;
  options: readonly T[];
  value: T | null;
  onChange: (v: T | null) => void;
  labelFor: (v: T) => string;
}) {
  return (
    <View style={styles.group}>
      <AppText variant="small" bold>
        {label}
      </AppText>
      <View style={styles.row}>
        {options.map((o) => (
          <Chip key={o} label={labelFor(o)} selected={value === o} onPress={() => onChange(value === o ? null : o)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: touch.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  on: { backgroundColor: colors.primary },
  label: { flexShrink: 1 },
});
