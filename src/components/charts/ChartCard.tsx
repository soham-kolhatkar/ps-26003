import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { colors, radius, shadow, space } from '@/theme/tokens';

type Props = {
  title: string;
  subtitle?: string;
  /** Every chart has a table twin — values never depend on tapping the chart. */
  table: readonly [string, string][];
  tableHeader: [string, string];
  showTableLabel: string;
  showChartLabel: string;
  children: ReactNode;
};

export function ChartCard({ title, subtitle, table, tableHeader, showTableLabel, showChartLabel, children }: Props) {
  const [asTable, setAsTable] = useState(false);
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.titles}>
          <AppText variant="large" bold>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" tone="muted">
              {subtitle}
            </AppText>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={asTable ? showChartLabel : showTableLabel}
          onPress={() => setAsTable(!asTable)}
          style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
        >
          <Icon name={asTable ? 'chart' : 'table'} size={18} color={colors.primary} />
          <AppText variant="caption" tone="primary" bold>
            {asTable ? showChartLabel : showTableLabel}
          </AppText>
        </Pressable>
      </View>
      {asTable ? (
        <View>
          <View style={[styles.tr, styles.th]}>
            <AppText variant="caption" bold>
              {tableHeader[0]}
            </AppText>
            <AppText variant="caption" bold>
              {tableHeader[1]}
            </AppText>
          </View>
          {table.map(([k, v], i) => (
            <View key={i} style={styles.tr}>
              <AppText variant="small">{k}</AppText>
              <AppText variant="small" style={styles.num}>
                {v}
              </AppText>
            </View>
          ))}
        </View>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    boxShadow: shadow.card,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  titles: { flex: 1 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.pill,
    minHeight: 36,
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.primarySoft },
  tr: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: space.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  th: { borderBottomWidth: 1 },
  num: { fontVariant: ['tabular-nums'] },
});
