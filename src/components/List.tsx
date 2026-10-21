import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { colors, radius, shadow, space } from '@/theme/tokens';

/** One white card holding rows, with hairlines between them (instead of a stack of buttons). */
export function ListGroup({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={styles.group}>
      {rows.map((row, i) => (
        <Fragment key={row.key ?? i}>
          {i > 0 ? <View style={styles.divider} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

type Tone = 'leaf' | 'clay' | 'lilac' | 'pond' | 'sun' | 'danger' | 'warning';
const BUBBLE: Record<Tone, { bg: string; fg: string }> = {
  leaf: { bg: colors.primarySoft, fg: colors.onPrimarySoft },
  clay: { bg: colors.clay, fg: colors.onClay },
  lilac: { bg: colors.tint.lilac, fg: '#5C3570' },
  pond: { bg: colors.tint.pond, fg: '#1F5C63' },
  sun: { bg: colors.tint.sun, fg: colors.warning },
  danger: { bg: colors.accentSoft, fg: colors.danger },
  warning: { bg: colors.warningSoft, fg: colors.warning },
};

type ListRowProps = {
  icon: IconName;
  tone?: Tone;
  title: string;
  /** One short line under the title. */
  subtitle?: string;
  /** Without it the row is information only (no chevron). */
  onPress?: () => void;
  /** Title colour for status rows (e.g. "Things to look at"). */
  titleColor?: string;
  testID?: string;
};

/** Icon bubble + title + one line + chevron. 76 dp tall; the accessible name is the title. */
export function ListRow({ icon, tone = 'leaf', title, subtitle, onPress, titleColor, testID }: ListRowProps) {
  const b = BUBBLE[tone];
  const body = (
    <>
      <View style={[styles.bubble, { backgroundColor: b.bg }]}>
        <Icon name={icon} size={22} color={b.fg} weight="fill" />
      </View>
      <View style={styles.text}>
        <AppText variant="body" weight="semibold" style={titleColor ? { color: titleColor } : undefined}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {onPress ? <Icon name="caret-right" size={22} color={colors.textMuted} /> : null}
    </>
  );
  if (!onPress)
    return (
      <View style={styles.row} accessible accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title} testID={testID}>
        {body}
      </View>
    );
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  group: { backgroundColor: colors.surface, borderRadius: radius.md, boxShadow: shadow.card, overflow: 'hidden' },
  divider: { height: 1, backgroundColor: colors.surfaceMuted, marginLeft: 74 },
  row: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 6,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  pressed: { backgroundColor: colors.primaryWash },
  bubble: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
