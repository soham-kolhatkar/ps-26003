import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { colors, radius, space } from '@/theme/tokens';

export type TabItem<K extends string> = { key: K; label: string; count?: number };

/** Segmented tabs: one section of a long page at a time (less to scan). */
export function Tabs<K extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
}) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const on = tab.key === value;
        const label = tab.count != null ? `${tab.label} (${tab.count})` : tab.label;
        return (
          <PressableScale
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={label}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, on && styles.on]}
            testID={`tab-${tab.key}`}
          >
            <AppText variant="small" weight={on ? 'bold' : 'semibold'} tone={on ? 'default' : 'muted'} center>
              {label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: space.xs, gap: space.xs, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  tab: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xs,
    borderRadius: radius.sm + 4,
  },
  on: { backgroundColor: colors.surface, boxShadow: '0px 1px 3px rgba(28, 33, 30, 0.12)' },
});
