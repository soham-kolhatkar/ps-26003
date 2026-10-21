import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { colors, space } from '@/theme/tokens';

export type Status = 'urgent' | 'soon' | 'well' | 'info';

/** Shape + colour + word (Medic/CHT 2025): ▲ urgent, ● soon, ✓ well. Staff phones only. */
export const STATUS: Record<Status, { icon: IconName; color: string; soft: string }> = {
  urgent: { icon: 'triangle', color: colors.danger, soft: colors.accentSoft },
  soon: { icon: 'circle', color: colors.warning, soft: colors.warningSoft },
  well: { icon: 'check-circle', color: colors.success, soft: colors.successSoft },
  info: { icon: 'info', color: colors.textMuted, soft: colors.surfaceMuted },
};

export function StatusLine({ status, text, testID }: { status: Status; text: string; testID?: string }) {
  const s = STATUS[status];
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.icon}>
        <Icon name={s.icon} size={18} weight="fill" color={s.color} />
      </View>
      <AppText variant="small" bold style={[styles.text, { color: s.color }]}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  /** One text line tall (18 sp × 1.45), so the icon sits beside the first line. */
  icon: { height: 26, justifyContent: 'center' },
  text: { flexShrink: 1 },
});
