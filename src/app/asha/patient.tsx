import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AlertsButton } from '@/components/AlertsButton';
import { DoctorNotes } from '@/components/DoctorNotes';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { TopBar } from '@/components/TopBar';
import { StatTile } from '@/components/charts/StatTile';
import { PatientCard } from '@/components/PatientCard';
import { Screen } from '@/components/Screen';
import { VisitStatusLine } from '@/components/VisitStatusLine';
import { alertCounts } from '@/db/repos/alerts';
import { listSessions } from '@/db/repos/games';
import { displayName, getPatient } from '@/db/repos/patients';
import { listVisits, type Visit } from '@/db/repos/visits';
import { useDbQuery } from '@/db/useDbQuery';
import { CHECKUP_CHANGE_POINTS, comparableCheckups, concerns, isCompleteCheckup, visitStatus } from '@/engine/visits';
import type { LanguageCode } from '@/i18n';
import { refreshAlerts } from '@/services/alerts';
import { formatShortDate } from '@/services/datetime';
import { useDevice } from '@/store/device';
import { useSettings } from '@/store/settings';
import { colors, radius, shadow, space } from '@/theme/tokens';

const DAY = 24 * 60 * 60 * 1000;

/** ASHA view of one patient: visit status, alerts, check-up trend, past visits → start a home visit. */
export default function AshaPatient() {
  const { t } = useTranslation();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const language = useSettings((s) => s.language);
  const cloud = useDevice((s) => s.mode) === 'cloud';
  const { data, reload } = useDbQuery(
    async (db) => {
      const now = Date.now();
      await refreshAlerts(db, patientId, now);
      const week = await listSessions(db, patientId, { since: now - 7 * DAY });
      return {
        now,
        patient: await getPatient(db, patientId),
        visits: await listVisits(db, patientId),
        alerts: await alertCounts(db, patientId),
        gamesThisWeek: week.filter((s) => s.completed).length,
      };
    },
    [patientId],
  );
  useFocusEffect(useCallback(() => reload(), [reload]));

  if (!data?.patient) return <Screen>{null}</Screen>;
  const name = displayName(data.patient);
  const status = visitStatus(data.visits[0] ?? null, data.now);
  // Trend and change use complete check-ups only (same tasks every time).
  const scored = comparableCheckups(data.visits);
  const [latest, previous] = scored;
  const change = latest && previous ? latest.checkupScore! - previous.checkupScore! : null;

  return (
    <Screen>
      <TopBar />
      <PatientCard patient={data.patient} showNotes />
      <VisitStatusLine status={status} />
      <BigButton
        size="large"
        icon="house"
        label={t('visit.start')}
        onPress={() => router.push({ pathname: '/asha/visit', params: { patientId } })}
      />
      <AlertsButton counts={data.alerts} patientId={patientId} pathname="/asha/alerts" showClear />
      {cloud ? (
        <BigButton
          kind="secondary"
          icon="users"
          label={t('people.button')}
          onPress={() => router.push({ pathname: '/asha/people', params: { patientId } })}
        />
      ) : null}
      {cloud ? (
        <BigButton
          kind="secondary"
          icon="bell"
          label={t('reminders.caregiver.title')}
          onPress={() => router.push({ pathname: '/asha/reminders', params: { patientId } })}
        />
      ) : null}

      <View style={styles.tiles}>
        <StatTile
          icon="note"
          label={t('visit.checkupTile')}
          value={latest ? String(latest.checkupScore) : t('progress.kpi.noData')}
          delta={
            change == null
              ? null
              : change <= -CHECKUP_CHANGE_POINTS
                ? { text: t('visit.changeDown', { n: -change }), tone: 'bad' }
                : change >= CHECKUP_CHANGE_POINTS
                  ? { text: t('visit.changeUp', { n: change }), tone: 'good' }
                  : { text: t('visit.changeSmall'), tone: 'neutral' }
          }
          caption={t('visit.checkupCaption', { count: scored.length })}
          trend={scored.length > 1 ? [...scored].reverse().map((v) => v.checkupScore!) : undefined}
        />
        <StatTile
          icon="game"
          label={t('visit.gamesTile')}
          value={String(data.gamesThisWeek)}
          caption={t('visit.gamesCaption', { name })}
        />
      </View>

      <DoctorNotes patientId={patientId} />

      <AppText variant="large" bold>
        {t('visit.history', { count: data.visits.length })}
      </AppText>
      {data.visits.length === 0 ? <AppText tone="muted">{t('visit.noVisits')}</AppText> : null}
      {data.visits.slice(0, 6).map((v) => (
        <VisitCard key={v.id} visit={v} language={language} />
      ))}
    </Screen>
  );
}

function VisitCard({ visit, language }: { visit: Visit; language: LanguageCode }) {
  const { t } = useTranslation();
  const worries = concerns(visit.observations);
  return (
    <View style={styles.visit}>
      <AppText bold>
        {formatShortDate(new Date(visit.startedAt), language)}
        {' · '}
        {visit.checkupScore != null ? t('visit.scoreLine', { score: visit.checkupScore }) : t('visit.noCheckup')}
        {visit.checkupScore != null && !isCompleteCheckup(visit.checkup) ? ` ${t('visit.partial')}` : ''}
      </AppText>
      {worries.length ? (
        <View style={styles.worries}>
          {worries.map((k) => (
            <View key={k} style={styles.worry}>
              <AppText variant="caption" bold>
                {t(`visit.obs.${k}.short`)}: {t(`visit.obs.${k}.${visit.observations[k]}`)}
              </AppText>
            </View>
          ))}
        </View>
      ) : (
        <AppText variant="small" tone="muted">
          {t('visit.allWell')}
        </AppText>
      )}
      {visit.note ? <AppText variant="small">📝 {visit.note}</AppText> : null}
      {visit.refer ? (
        <AppText variant="small" bold>
          {t('visit.referred')}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  visit: {
    gap: space.xs,
    padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    boxShadow: shadow.card,
  },
  worries: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  worry: {
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.warningSoft,
  },
});
