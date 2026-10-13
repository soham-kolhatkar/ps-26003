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
import { formatShortDate } from '@/services/datetime';
import { useSettings } from '@/store/settings';
import { colors, radius, space } from '@/theme/tokens';

const DAY = 24 * 60 * 60 * 1000;
const REFERRAL_DAYS = 30;

type StaffPatientListProps = {
  footer?: string;
  /** Where "things to look at" opens for this role. */
  alertsPath: '/asha/alerts' | '/doctor/alerts';
  /** Opens the patient's page when the card is tapped. */
  patientPath?: '/asha/patient' | '/doctor/patient';
  /** Show home-visit status and put overdue visits near the top (ASHA). */
  withVisits?: boolean;
  /** Show "Referred by the ASHA worker" and list referred patients first (doctor). */
  withReferrals?: boolean;
};

/**
 * Home for multi-patient staff roles (ASHA, doctor): header + linked patients,
 * patients with open alerts first (most serious first), so the list doubles
 * as a triage list.
 */
export function StaffPatientList({
  footer,
  alertsPath,
  patientPath,
  withVisits,
  withReferrals,
}: StaffPatientListProps) {
  const language = useSettings((s) => s.language);
  const { t } = useTranslation();
  const userId = useSession((s) => s.userId) ?? '';
  const { data, reload } = useDbQuery(
    async (db) => {
      const linked = await listPatientsForUser(db, userId);
      const now = Date.now();
      const withCounts: {
        patient: (typeof linked)[number];
        counts: AlertCounts;
        visit: VisitStatus | null;
        referredAt: number | null;
      }[] = [];
      for (const p of linked) {
        await refreshAlerts(db, p.id);
        const last = withVisits || withReferrals ? await lastVisit(db, p.id) : null;
        const visit = withVisits ? visitStatus(last, now) : null;
        // A referral counts while it is recent (30 days) and no later visit cleared it.
        const referredAt =
          withReferrals && last?.refer && last.startedAt >= now - REFERRAL_DAYS * DAY ? last.startedAt : null;
        withCounts.push({ patient: p, counts: await alertCounts(db, p.id), visit, referredAt });
      }
      // Triage order: serious alerts, then overdue visits, then any open alert.
      const urgency = (v: VisitStatus | null) => (v ? visitUrgency(v) : 0);
      const referred = (x: { referredAt: number | null }) => (x.referredAt ? 1 : 0);
      withCounts.sort(
        (a, b) =>
          b.counts.serious - a.counts.serious ||
          referred(b) - referred(a) ||
          urgency(b.visit) - urgency(a.visit) ||
          b.counts.open - a.counts.open,
      );
      return { user: await getUser(db, userId), patients: withCounts };
    },
    [userId, withVisits, withReferrals],
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
      {data.patients.map(({ patient, counts, visit, referredAt }) => (
        <View key={patient.id} style={styles.patient}>
          <PatientCard
            patient={patient}
            onPress={
              patientPath ? () => router.push({ pathname: patientPath, params: { patientId: patient.id } }) : undefined
            }
          />
          {visit ? <VisitStatusLine status={visit} /> : null}
          {referredAt ? (
            <View style={styles.referred}>
              <AppText variant="small" bold>
                🩺 {t('doctor.referredList', { date: formatShortDate(new Date(referredAt), language) })}
              </AppText>
            </View>
          ) : null}
          <AlertsButton counts={counts} patientId={patient.id} pathname={alertsPath} showClear />
        </View>
      ))}
      {footer ? <AppText tone="muted">{footer}</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  patient: { gap: space.sm },
  referred: {
    alignSelf: 'flex-start',
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.warningSoft,
  },
});
