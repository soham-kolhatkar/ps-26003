import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AlertsButton } from '@/components/AlertsButton';
import { AppText } from '@/components/AppText';
import { PatientCard } from '@/components/PatientCard';
import { Screen } from '@/components/Screen';
import { StaffHeader } from '@/components/StaffHeader';
import { alertCounts } from '@/db/repos/alerts';
import { listPatientsForUser } from '@/db/repos/patients';
import { getUser } from '@/db/repos/users';
import { useDbQuery } from '@/db/useDbQuery';
import { refreshAlerts } from '@/services/alerts';
import { useSession } from '@/store/session';
import { space } from '@/theme/tokens';

type StaffPatientListProps = {
  footer?: string;
  /** Where "things to look at" opens for this role. */
  alertsPath: '/asha/alerts' | '/doctor/alerts';
};

/**
 * Home for multi-patient staff roles (ASHA, doctor): header + linked patients,
 * patients with open alerts first (most serious first), so the list doubles
 * as a triage list.
 */
export function StaffPatientList({ footer, alertsPath }: StaffPatientListProps) {
  const { t } = useTranslation();
  const userId = useSession((s) => s.userId) ?? '';
  const { data, reload } = useDbQuery(
    async (db) => {
      const linked = await listPatientsForUser(db, userId);
      const withCounts = [];
      for (const p of linked) {
        await refreshAlerts(db, p.id);
        withCounts.push({ patient: p, counts: await alertCounts(db, p.id) });
      }
      withCounts.sort((a, b) => b.counts.serious - a.counts.serious || b.counts.open - a.counts.open);
      return { user: await getUser(db, userId), patients: withCounts };
    },
    [userId],
  );
  useFocusEffect(useCallback(() => reload(), [reload]));

  if (!data?.user) return <Screen>{null}</Screen>;

  return (
    <Screen>
      <StaffHeader user={data.user} />
      <AppText variant="large" bold>
        {t('staff.yourPatients', { count: data.patients.length })}
      </AppText>
      {data.patients.length === 0 ? <AppText tone="muted">{t('staff.noPatients')}</AppText> : null}
      {data.patients.map(({ patient, counts }) => (
        <View key={patient.id} style={styles.patient}>
          <PatientCard patient={patient} />
          <AlertsButton counts={counts} patientId={patient.id} pathname={alertsPath} showClear />
        </View>
      ))}
      {footer ? <AppText tone="muted">{footer}</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  patient: { gap: space.sm },
});
