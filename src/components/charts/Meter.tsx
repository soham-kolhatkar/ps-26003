import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { chart, radius, space } from '@/theme/tokens';

/** Ratio against 100%: filled bar on a lighter track of the same hue. */
export function Meter({ label, ratio, valueText }: { label: string; ratio: number; valueText: string }) {
  const pct = Math.max(0, Math.min(1, ratio));
  return (
    <View style={styles.wrap} accessible accessibilityLabel={`${label}: ${valueText}`}>
      <View style={styles.row}>
        <AppText variant="small">{label}</AppText>
        <AppText variant="small" bold>
          {valueText}
        </AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 10, borderRadius: radius.pill, backgroundColor: chart.seriesWash, overflow: 'hidden' },
  fill: { height: 10, borderRadius: radius.pill, backgroundColor: chart.series },
});
