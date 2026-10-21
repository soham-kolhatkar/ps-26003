import { router, useFocusEffect } from 'expo-router';
import { useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AlertBadge } from '@/components/AlertBadge';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Picture } from '@/components/Picture';
import { VisitStatusLine } from '@/components/VisitStatusLine';
import { Screen } from '@/components/Screen';
import { StaffHeader } from '@/components/StaffHeader';
import { STATUS, StatusLine, type Status } from '@/components/StatusLine';
import { alertCounts, type AlertCounts } from '@/db/repos/alerts';
import type { LinkedPatient } from '@/db/models';
import { listPatientsForUser } from '@/db/repos/patients';
import { lastVisit } from '@/db/repos/visits';
import { getUser } from '@/db/repos/users';
import { useDbQuery } from '@/db/useDbQuery';
import { visitStatus, visitUrgency, type VisitStatus } from '@/engine/visits';
import { refreshAlerts } from '@/services/alerts';
import { useDevice } from '@/store/device';
import { useCloudRefresh } from '@/sync/refresh';
import { useSession } from '@/store/session';
import { formatShortDate } from '@/services/datetime';
import { useSettings } from '@/store/settings';
import { colors, radius, shadow, space } from '@/theme/tokens';

const DAY = 24 * 60 * 60 * 1000;
const REFERRAL_DAYS = 30;

type StaffPatientListProps = {
  footer?: string;
  /** Opens the patient's page when the card is tapped. */
  patientPath?: '/asha/patient' | '/doctor/patient';
  /** Show home-visit status and put overdue visits near the top (ASHA). */
  withVisits?: boolean;
  /** Show "Referred by the ASHA worker" and list referred patients first (doctor). */
  withReferrals?: boolean;
  /** Cloud mode: where "Register a patient" (ASHA) and "Join with a code" go. */
  registerPath?: '/asha/patient-new';
  joinPath?: '/asha/join' | '/doctor/join';
};

/**
 * Home for multi-patient staff roles (ASHA, doctor): header + linked patients,
 * patients with open alerts first (most serious first), so the list doubles
 * as a triage list.
 */
export function StaffPatientList({
  footer,
  patientPath,
  withVisits,
  withReferrals,
  registerPath,
  joinPath,
}: StaffPatientListProps) {
  const cloud = useDevice((s) => s.mode) === 'cloud';
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
  useCloudRefresh(reload);

  if (!data?.user) return <Screen>{null}</Screen>;

  // Sections (Medic/CHT 2025: urgent first, colour + shape + word): referred (doctor), needs attention, doing well.
  type Row = (typeof data.patients)[number];
  const needsAttention = (r: Row) =>
    r.counts.open > 0 || (r.visit != null && (r.visit.state === 'overdue' || r.visit.state === 'due' || r.visit.state === 'never'));
  const referred = data.patients.filter((r) => r.referredAt != null);
  const attention = data.patients.filter((r) => r.referredAt == null && needsAttention(r));
  const well = data.patients.filter((r) => r.referredAt == null && !needsAttention(r));
  const open = (id: string) =>
    patientPath ? () => router.push({ pathname: patientPath, params: { patientId: id } }) : undefined;
  const summary = [
    referred.length ? t('staff.summaryReferred', { count: referred.length }) : null,
    attention.length ? t('staff.summaryAttention', { count: attention.length }) : null,
    well.length && (referred.length || attention.length) ? t('staff.summaryWell', { count: well.length }) : null,
    well.length && !referred.length && !attention.length ? t('staff.allWell') : null,
  ]
    .filter(Boolean)
    .join(' ');

  const card = (r: Row) => (
    <StaffPatientCard
      key={r.patient.id}
      row={r}
      onPress={open(r.patient.id)}
      referredText={
        r.referredAt ? t('doctor.referredList', { date: formatShortDate(new Date(r.referredAt), language) }) : null
      }
    />
  );

  return (
    <Screen>
      <StaffHeader user={data.user} />
      {data.patients.length === 0 ? (
        <AppText tone="muted">{t('staff.noPatients')}</AppText>
      ) : (
        <View style={styles.summary}>
          <AppText variant="body" weight="semibold">
            {summary}
          </AppText>
        </View>
      )}
      {referred.length ? (
        <Section status="urgent" title={t('staff.sectionReferred')} count={referred.length}>
          {referred.map(card)}
        </Section>
      ) : null}
      {attention.length ? (
        <Section status="soon" title={t('staff.sectionAttention')} count={attention.length}>
          {attention.map(card)}
        </Section>
      ) : null}
      {well.length ? (
        <Section status="well" title={t('staff.sectionWell')} count={well.length}>
          {well.map(card)}
        </Section>
      ) : null}
      {cloud && (registerPath || joinPath) ? (
        <View style={styles.actions}>
          {registerPath ? (
            <BigButton kind="secondary" icon="plus" label={t('people.register')} onPress={() => router.push(registerPath)} />
          ) : null}
          {joinPath ? (
            <BigButton kind="secondary" icon="key" label={t('people.joinButton')} onPress={() => router.push(joinPath)} />
          ) : null}
        </View>
      ) : null}
      {footer ? (
        <AppText variant="small" tone="muted">
          {footer}
        </AppText>
      ) : null}
    </Screen>
  );
}

function Section({ status, title, count, children }: { status: Status; title: string; count: number; children: ReactNode }) {
  const s = STATUS[status];
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Icon name={s.icon} size={18} weight="fill" color={s.color} />
        <AppText variant="body" weight="bold" style={{ color: s.color }}>
          {title} ({count})
        </AppText>
      </View>
      {children}
    </View>
  );
}

type CardRow = { patient: LinkedPatient; counts: AlertCounts; visit: VisitStatus | null };

/** One patient = one card: picture, name, age · village, the one status line that matters, alert badge. */
function StaffPatientCard({
  row,
  onPress,
  referredText,
}: {
  row: CardRow;
  onPress?: () => void;
  referredText: string | null;
}) {
  const { t } = useTranslation();
  const { patient, counts, visit } = row;
  const meta = [patient.age != null ? t('staff.years', { count: patient.age }) : null, patient.village]
    .filter(Boolean)
    .join(' · ');
  return (
    <Card onPress={onPress} accessibilityLabel={patient.name}>
      <View style={styles.cardRow}>
        <View style={styles.avatar}>
          <Picture glyph={patient.avatar ?? '🙂'} size={44} />
          <View style={styles.badge}>
            <AlertBadge counts={counts} />
          </View>
        </View>
        <View style={styles.cardBody}>
          <AppText variant="large" weight="bold">
            {patient.name}
          </AppText>
          {meta ? (
            <AppText variant="small" tone="muted">
              {meta}
            </AppText>
          ) : null}
          {referredText ? <StatusLine status="urgent" text={referredText} /> : null}
          {visit ? <VisitStatusLine status={visit} /> : null}
        </View>
        {onPress ? <Icon name="caret-right" size={22} color={colors.textMuted} /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  summary: { borderRadius: radius.md, backgroundColor: colors.surface, padding: space.md, boxShadow: shadow.card },
  section: { gap: space.sm + 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 4 },
  badge: { position: 'absolute', top: -6, right: -8 },
  actions: { gap: space.sm + 4 },
});
