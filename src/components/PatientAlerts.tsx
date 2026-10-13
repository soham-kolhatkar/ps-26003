import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AlertCard } from '@/components/AlertCard';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Screen } from '@/components/Screen';
import { listAlerts, markAlertsSeen } from '@/db/repos/alerts';
import { displayName, getPatient } from '@/db/repos/patients';
import { useDbQuery } from '@/db/useDbQuery';
import { refreshAlerts } from '@/services/alerts';
import { colors, radius, space } from '@/theme/tokens';

const DAY = 24 * 60 * 60 * 1000;

/**
 * "Things to look at" for one patient (`?patientId=`), shared by the
 * caregiver, ASHA and doctor routes. Opening it re-checks the trends and
 * marks the open alerts as seen.
 */
export function PatientAlerts() {
  const { t } = useTranslation();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const { data, reload } = useDbQuery(
    async (db) => {
      const now = Date.now();
      await refreshAlerts(db, patientId, now);
      // Read before marking seen, so this visit still shows what is new.
      const alerts = await listAlerts(db, patientId, { resolvedSince: now - 30 * DAY });
      await markAlertsSeen(db, patientId, now);
      return { patient: await getPatient(db, patientId), alerts };
    },
    [patientId],
  );
  useFocusEffect(useCallback(() => reload(), [reload]));

  const name = data?.patient ? displayName(data.patient) : '';
  const open = data?.alerts.filter((a) => a.resolvedAt == null) ?? [];
  const resolved = data?.alerts.filter((a) => a.resolvedAt != null) ?? [];

  return (
    <Screen>
      <BigButton kind="ghost" icon="⬅️" label={t('common.back')} onPress={() => router.back()} />
      <AppText variant="title">{t('alerts.title', { name })}</AppText>
      {data && open.length === 0 ? (
        <View style={styles.none}>
          <AppText variant="large">✅ {t('alerts.none')}</AppText>
        </View>
      ) : null}
      {open.map((a) => (
        <AlertCard key={a.id} alert={a} patientName={name} />
      ))}
      {resolved.length ? (
        <>
          <AppText variant="large" bold>
            {t('alerts.resolvedSection')}
          </AppText>
          {resolved.map((a) => (
            <AlertCard key={a.id} alert={a} patientName={name} compact />
          ))}
        </>
      ) : null}
      <View style={styles.about}>
        <AppText variant="small" bold>
          {t('alerts.howTitle')}
        </AppText>
        <AppText variant="small" tone="muted">
          {t('alerts.how')}
        </AppText>
        <AppText variant="small" tone="muted">
          {t('alerts.disclaimer')}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  none: { padding: space.md, backgroundColor: colors.successSoft, borderRadius: radius.md },
  about: { gap: space.xs, padding: space.md, backgroundColor: colors.surfaceMuted, borderRadius: radius.md },
});
