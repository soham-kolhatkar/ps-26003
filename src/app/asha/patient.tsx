import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AlertCard } from '@/components/AlertCard';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { DoctorNotes } from '@/components/DoctorNotes';
import { Icon } from '@/components/Icon';
import { ListGroup, ListRow } from '@/components/List';
import { PatientCard } from '@/components/PatientCard';
import { Screen } from '@/components/Screen';
import { StatusLine } from '@/components/StatusLine';
import { Tabs } from '@/components/Tabs';
import { TopBar } from '@/components/TopBar';
import { VisitStatusLine } from '@/components/VisitStatusLine';
import { StatTile } from '@/components/charts/StatTile';
import { listAlerts, markAlertsSeen } from '@/db/repos/alerts';
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

type Tab = 'alerts' | 'visits' | 'notes';

/**
 * ASHA view of one patient: visit status → start a home visit; then one section at a
 * time (things to look at, past visits, doctor's notes) instead of one long page.
 */
export default function AshaPatient() {
  const { t } = useTranslation();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const language = useSettings((s) => s.language);
  const cloud = useDevice((s) => s.mode) === 'cloud';
  const [tab, setTab] = useState<Tab | null>(null);
  const { data, reload } = useDbQuery(
    async (db) => {
      const now = Date.now();
      await refreshAlerts(db, patientId, now);
      const week = await listSessions(db, patientId, { since: now - 7 * DAY });
      // Read before marking seen, so this visit still shows what is new.
      const alerts = await listAlerts(db, patientId, { resolvedSince: now - 30 * DAY });
      await markAlertsSeen(db, patientId, now);
      return {
        now,
        patient: await getPatient(db, patientId),
        visits: await listVisits(db, patientId),
        alerts,
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
  const open = data.alerts.filter((a) => a.resolvedAt == null);
  const shown: Tab = tab ?? (open.length ? 'alerts' : 'visits');

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
      {cloud ? (
        <ListGroup>
          <ListRow
            icon="bell"
            tone="clay"
            title={t('reminders.caregiver.title')}
            onPress={() => router.push({ pathname: '/asha/reminders', params: { patientId } })}
          />
          <ListRow
            icon="users"
            tone="pond"
            title={t('people.button')}
            subtitle={t('people.rowHint', { name })}
            onPress={() => router.push({ pathname: '/asha/people', params: { patientId } })}
          />
        </ListGroup>
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

      <Tabs
        tabs={[
          { key: 'alerts', label: t('alerts.tabShort'), count: open.length },
          { key: 'visits', label: t('visit.tab'), count: data.visits.length },
          { key: 'notes', label: t('notes.tab') },
        ]}
        value={shown}
        onChange={setTab}
      />

      {shown === 'alerts' ? (
        <View style={styles.section}>
          {open.length === 0 ? <StatusLine status="well" text={t('alerts.noConcerns')} /> : null}
          {open.map((a) => (
            <AlertCard key={a.id} alert={a} patientName={name} compact />
          ))}
          {data.alerts.length > open.length ? (
            <BigButton
              kind="ghost"
              icon="caret-right"
              label={t('alerts.seeAll', { count: data.alerts.length })}
              onPress={() => router.push({ pathname: '/asha/alerts', params: { patientId } })}
            />
          ) : null}
        </View>
      ) : null}

      {shown === 'visits' ? (
        <View style={styles.section}>
          {data.visits.length === 0 ? <AppText tone="muted">{t('visit.noVisits')}</AppText> : null}
          {data.visits.slice(0, 6).map((v) => (
            <VisitCard key={v.id} visit={v} language={language} />
          ))}
        </View>
      ) : null}

      {shown === 'notes' ? <DoctorNotes patientId={patientId} /> : null}
    </Screen>
  );
}

function VisitCard({ visit, language }: { visit: Visit; language: LanguageCode }) {
  const { t } = useTranslation();
  const worries = concerns(visit.observations);
  return (
    <View style={styles.visit}>
      <AppText weight="semibold">
        {formatShortDate(new Date(visit.startedAt), language)}
        {' · '}
        {visit.checkupScore != null ? t('visit.scoreLine', { score: visit.checkupScore }) : t('visit.noCheckup')}
        {visit.checkupScore != null && !isCompleteCheckup(visit.checkup) ? ` ${t('visit.partial')}` : ''}
      </AppText>
      {worries.length ? (
        <View style={styles.worries}>
          {worries.map((k) => (
            <View key={k} style={styles.worry}>
              <AppText variant="caption" bold style={{ color: colors.warning }}>
                {t(`visit.obs.${k}.short`)}: {t(`visit.obs.${k}.${visit.observations[k]}`)}
              </AppText>
            </View>
          ))}
        </View>
      ) : (
        <StatusLine status="well" text={t('visit.allWell')} />
      )}
      {visit.note ? (
        <View style={styles.note}>
          <Icon name="note" size={18} color={colors.textMuted} />
          <AppText variant="small" style={styles.noteText}>
            {visit.note}
          </AppText>
        </View>
      ) : null}
      {visit.refer ? <StatusLine status="urgent" text={t('visit.referred')} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  section: { gap: space.sm + 4 },
  visit: {
    gap: space.sm,
    padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    boxShadow: shadow.card,
  },
  worries: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2 },
  worry: {
    paddingHorizontal: space.sm + 2,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.warningSoft,
  },
  note: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  noteText: { flex: 1 },
});
