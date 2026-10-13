import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AlertsButton } from '@/components/AlertsButton';
import { AppText } from '@/components/AppText';
import { PatientCard } from '@/components/PatientCard';
import { VisitStatusLine } from '@/components/VisitStatusLine';
import { Screen } from '@/components/Screen';
import { StaffHeader } from '@/components/StaffHeader';
import { alertCounts, type AlertCounts } from '@/db/repos/alerts';
import { listPatientsForUser } from '@/db/repos/patients';
import { lastVisit } from '@/db/repos/visits';
import { getUser } from '@/db/repos/users';
import { useDbQuery } from '@/db/useDbQuery';
import { visitStatus, visitUrgency, type VisitStatus } from '@/engine/visits';
import { refreshAlerts } from '@/services/alerts';
import { useSession } from '@/store/session';
import { space } from '@/theme/tokens';

type StaffPatientListProps = {
  footer?: string;
  /** Where "things to look at" opens for this role. */
  alertsPath: '/asha/alerts' | '/doctor/alerts';
  /** Opens the patient's page when the card is tapped. */
  patientPath?: '/asha/patient';
  /** Show home-visit status and put overdue visits near the top (ASHA). */
  withVisits?: boolean;
};

/**
 * Home for multi-patient staff roles (ASHA, doctor): header + linked patients,
 * patients with open alerts first (most serious first), so the list doubles
 * as a triage list.
 */
export function StaffPatientList({ footer, alertsPath, patientPath, withVisits }: StaffPatientListProps) {
  const { t } = useTranslation();
  const userId = useSession((s) => s.userId) ?? '';
  const { data, reload } = useDbQuery(
    async (db) => {
      const linked = await listPatientsForUser(db, userId);
      const now = Date.now();
      const withCounts: { patient: (typeof linked)[number]; counts: AlertCounts; visit: VisitStatus | null }[] = [];
      for (const p of linked) {
        await refreshAlerts(db, p.id);
        const visit = withVisits ? visitStatus(await lastVisit(db, p.id), now) : null;
        withCounts.push({ patient: p, counts: await alertCounts(db, p.id), visit });
      }
      // Triage order: serious alerts, then overdue visits, then any open alert.
      const urgency = (v: VisitStatus | null) => (v ? visitUrgency(v) : 0);
      withCounts.sort(
        (a, b) =>
          b.counts.serious - a.counts.serious || urgency(b.visit) - urgency(a.visit) || b.counts.open - a.counts.open,
      );
      return { user: await getUser(db, userId), patients: withCounts };
    },
    [userId, withVisits],
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
      {data.patients.map(({ patient, counts, visit }) => (
        <View key={patient.id} style={styles.patient}>
          <PatientCard
            patient={patient}
            onPress={
              patientPath ? () => router.push({ pathname: patientPath, params: { patientId: patient.id } }) : undefined
            }
          />
          {visit ? <VisitStatusLine status={visit} /> : null}
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
