import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AlertCard } from '@/components/AlertCard';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { StatusLine } from '@/components/StatusLine';
import { TopBar } from '@/components/TopBar';
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
  const [showHow, setShowHow] = useState(false);
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
      <TopBar />
      <AppText variant="title">{t('alerts.title', { name })}</AppText>
      {data && open.length === 0 ? <StatusLine status="well" text={t('alerts.none')} /> : null}
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
        <BigButton
          kind="ghost"
          icon={showHow ? 'caret-left' : 'info'}
          label={t('alerts.howTitle')}
          onPress={() => setShowHow(!showHow)}
        />
        {showHow ? (
          <AppText variant="small" tone="muted">
            {t('alerts.how')}
          </AppText>
        ) : null}
        <AppText variant="small" tone="muted">
          {t('alerts.disclaimer')}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  about: { gap: space.xs, padding: space.md, backgroundColor: colors.surfaceMuted, borderRadius: radius.md },
});
