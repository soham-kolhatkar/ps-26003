import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { Picture } from '@/components/Picture';
import { colors, radius, shadow, space } from '@/theme/tokens';

import { Sparkline } from './Sparkline';

export type DeltaTone = 'good' | 'bad' | 'neutral';

type Props = {
  label: string;
  value: string;
  /** e.g. "↑ 6 vs previous 7 days" — always arrow + words, never color alone. */
  delta?: { text: string; tone: DeltaTone } | null;
  caption?: string;
  trend?: readonly (number | null)[];
  /** A UI icon before the label… */
  icon?: IconName;
  /** …or a picture (a game's glyph). */
  glyph?: string;
  /** Three tiles in one row (instead of two). */
  third?: boolean;
};

const DELTA_COLOR: Record<DeltaTone, string> = {
  good: colors.success,
  bad: colors.warning,
  neutral: colors.textMuted,
};

/** Stat tile: label · value · optional delta · optional sparkline. */
export function StatTile({ label, value, delta, caption, trend, icon, glyph, third }: Props) {
  return (
    <View
      style={[styles.tile, third && styles.third]}
      accessible
      accessibilityLabel={[label, value, delta?.text, caption].filter(Boolean).join(', ')}
    >
      <View style={styles.label}>
        {glyph ? <Picture glyph={glyph} size={22} /> : null}
        {icon ? <Icon name={icon} size={18} color={colors.textMuted} /> : null}
        <AppText variant="caption" tone="muted" numberOfLines={2} style={styles.labelText}>
          {label}
        </AppText>
      </View>
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
  label: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  labelText: { flexShrink: 1 },
  tile: {
    flexBasis: '46%',
    flexGrow: 1,
    gap: 2,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    boxShadow: shadow.card,
  },
  third: { flexBasis: '30%', paddingHorizontal: space.sm + 4 },
});
