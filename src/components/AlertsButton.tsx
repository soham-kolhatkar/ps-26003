import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/PressableScale';
import { STATUS, StatusLine } from '@/components/StatusLine';
import type { AlertCounts } from '@/db/repos/alerts';
import { radius, space, touch } from '@/theme/tokens';

type AlertsButtonProps = {
  counts: AlertCounts | undefined;
  patientId: string;
  pathname: '/caregiver/alerts' | '/asha/alerts' | '/doctor/alerts';
  /** Say "no concerns" when there are no open alerts (triage lists). */
  showClear?: boolean;
};

/** "▲ Things to look at: 2 (1 new) ›" → the patient's alerts screen. */
export function AlertsButton({ counts, patientId, pathname, showClear }: AlertsButtonProps) {
  const { t } = useTranslation();
  if (!counts?.open) {
    return showClear ? <StatusLine status="well" text={t('alerts.noConcerns')} /> : null;
  }
  const label = counts.unseen
    ? t('alerts.bannerNew', { count: counts.open, unseen: counts.unseen })
    : t('alerts.banner', { count: counts.open });
  const s = STATUS[counts.serious ? 'urgent' : 'soon'];
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push({ pathname, params: { patientId } })}
      style={({ pressed }) => [styles.row, { backgroundColor: s.soft }, pressed && styles.pressed]}
    >
      <Icon name={s.icon} size={22} weight="fill" color={s.color} />
      <AppText variant="body" bold style={[styles.label, { color: s.color }]}>
        {label}
      </AppText>
      <Icon name="caret-right" size={22} color={s.color} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 4,
    minHeight: touch.min,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
  },
  label: { flex: 1 },
  pressed: { opacity: 0.85 },
});
