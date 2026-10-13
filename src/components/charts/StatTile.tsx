import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radius, space } from '@/theme/tokens';

import { Sparkline } from './Sparkline';

export type DeltaTone = 'good' | 'bad' | 'neutral';

type Props = {
  label: string;
  value: string;
  /** e.g. "↑ 6 vs previous 7 days" — always arrow + words, never color alone. */
  delta?: { text: string; tone: DeltaTone } | null;
  caption?: string;
  trend?: readonly (number | null)[];
  icon?: string;
};

const DELTA_COLOR: Record<DeltaTone, string> = {
  good: colors.success,
  bad: colors.warning,
  neutral: colors.textMuted,
};

/** Stat tile: label · value · optional delta · optional sparkline. */
export function StatTile({ label, value, delta, caption, trend, icon }: Props) {
  return (
    <View
      style={styles.tile}
      accessible
      accessibilityLabel={[label, value, delta?.text, caption].filter(Boolean).join(', ')}
    >
      <AppText variant="caption" tone="muted" numberOfLines={2}>
        {icon ? `${icon} ` : ''}
        {label}
      </AppText>
      <AppText variant="title">{value}</AppText>
      {delta ? (
        <AppText variant="caption" bold style={{ color: DELTA_COLOR[delta.tone] }}>
          {delta.text}
        </AppText>
      ) : null}
      {caption ? (
        <AppText variant="caption" tone="muted">
          {caption}
        </AppText>
      ) : null}
      {trend ? <Sparkline values={trend} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: '46%',
    flexGrow: 1,
    gap: 2,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
