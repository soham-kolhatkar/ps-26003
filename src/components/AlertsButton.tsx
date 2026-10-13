import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import type { AlertCounts } from '@/db/repos/alerts';

type AlertsButtonProps = {
  counts: AlertCounts | undefined;
  patientId: string;
  pathname: '/caregiver/alerts' | '/asha/alerts' | '/doctor/alerts';
  /** Say "no concerns" when there are no open alerts (triage lists). */
  showClear?: boolean;
};

/** "⚠️ Things to look at: 2 (1 new)" → the patient's alerts screen. */
export function AlertsButton({ counts, patientId, pathname, showClear }: AlertsButtonProps) {
  const { t } = useTranslation();
  if (!counts?.open) {
    return showClear ? (
      <AppText variant="small" tone="muted">
        ✅ {t('alerts.noConcerns')}
      </AppText>
    ) : null;
  }
  const label = counts.unseen
    ? t('alerts.bannerNew', { count: counts.open, unseen: counts.unseen })
    : t('alerts.banner', { count: counts.open });
  return (
    <BigButton
      kind="secondary"
      icon={counts.serious ? '🔴' : '🟠'}
      label={label}
      onPress={() => router.push({ pathname, params: { patientId } })}
    />
  );
}
