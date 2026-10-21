import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { colors, radius, space } from '@/theme/tokens';

type TopBarProps = {
  /** Left button action. Default: back, or home when there is nothing to go back to. */
  onBack?: () => void;
  /** Left button label and icon (default "Back" with a caret). */
  backLabel?: string;
  backIcon?: IconName;
  /** No left button (a home screen). */
  noBack?: boolean;
  /** Short screen title next to the back button (staff screens). */
  title?: string;
  /** Right side: Read aloud, sync status, settings. */
  right?: ReactNode;
};

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** Same place on every screen (WCAG 3.2.3): back / stop on the left, help on the right. */
export function TopBar({ onBack = goBack, backLabel, backIcon = 'caret-left', noBack, title, right }: TopBarProps) {
  const { t } = useTranslation();
  const label = backLabel ?? t('common.back');
  return (
    <View style={styles.bar}>
      {noBack ? null : <TopBarButton icon={backIcon} label={label} onPress={onBack} />}
      {title ? (
        <AppText variant="large" weight="bold" style={styles.title} numberOfLines={2}>
          {title}
        </AppText>
      ) : (
        <View style={styles.spacer} />
      )}
      {right}
    </View>
  );
}

/** A pill button for the top bar (52 dp tall, icon + label). */
export function TopBarButton({
  icon,
  label,
  onPress,
  tonal,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  /** Leaf background (Read aloud on patient screens). */
  tonal?: boolean;
  testID?: string;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.pill, tonal && styles.tonal, pressed && styles.pressed]}
    >
      <Icon name={icon} size={22} color={tonal ? colors.onPrimarySoft : colors.text} />
      <AppText variant="small" weight="semibold" tone={tonal ? 'onPrimarySoft' : 'default'}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 4, minHeight: 52 },
  title: { flex: 1 },
  spacer: { flex: 1 },
  pill: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    paddingLeft: space.sm + 4,
    paddingRight: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  tonal: { backgroundColor: colors.primarySoft, paddingLeft: space.md },
  pressed: { opacity: 0.85 },
});
