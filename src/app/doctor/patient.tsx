import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share, StyleSheet, View } from 'react-native';

import { AlertCard } from '@/components/AlertCard';
import { DoctorNotes } from '@/components/DoctorNotes';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Icon, type IconName } from '@/components/Icon';
import { ListGroup, ListRow } from '@/components/List';
import { Picture } from '@/components/Picture';
import { Tabs } from '@/components/Tabs';
import { TopBar } from '@/components/TopBar';
import { ChartCard } from '@/components/charts/ChartCard';
import { LineChart } from '@/components/charts/LineChart';
import { Meter } from '@/components/charts/Meter';
import { StatTile, type DeltaTone } from '@/components/charts/StatTile';
import { PatientCard } from '@/components/PatientCard';
import { Screen } from '@/components/Screen';
import type { Patient } from '@/db/models';
import { listAlerts, type StoredAlert } from '@/db/repos/alerts';
import { listSessions } from '@/db/repos/games';
import { displayName, getPatient } from '@/db/repos/patients';
import { ensureEvents, listOccurrences } from '@/db/repos/reminders';
import { getUser } from '@/db/repos/users';
import { listVisits } from '@/db/repos/visits';
import { useDbQuery } from '@/db/useDbQuery';
import {
  adherenceOver,
  domainSummaries,
  gameRows,
  reactionSummary,
  reportWindow,
  weeklyIndex,
  type Comparison,
  type ReportSession,
} from '@/engine/report';
import { comparableCheckups, concerns } from '@/engine/visits';
import { GAMES } from '@/games/registry';
import { refreshAlerts } from '@/services/alerts';
import { formatDayMonth, formatShortDate } from '@/services/datetime';
import { useDevice } from '@/store/device';
import { useSettings } from '@/store/settings';
import { colors, radius, shadow, space } from '@/theme/tokens';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Doctor's read-only cognitive trend report for one patient (last 30 days):
 * referral, alerts, ability domains, weekly index, per-game table, reaction
 * time, medicines, ASHA check-ups, and a plain-text summary to share.
 */
export default function DoctorReport() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'summary' | 'games' | 'care' | 'notes'>('summary');
  const [showHow, setShowHow] = useState(false);
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const language = useSettings((s) => s.language);
  const cloud = useDevice((s) => s.mode) === 'cloud';
  const { data, reload } = useDbQuery(
    async (db) => {
      const now = Date.now();
      await refreshAlerts(db, patientId, now);
      const sessions: ReportSession[] = (await listSessions(db, patientId, { since: now - 60 * DAY, limit: 3000 })).map(
        (s) => ({
          gameId: s.gameId,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          level: s.level,
          score: s.stats.score,
          completed: s.completed,
          avgReactionMs: s.stats.avgReactionMs,
        }),
      );
      await ensureEvents(db, patientId, now - 31 * DAY, now + DAY);
      const occurrences = (await listOccurrences(db, patientId, now - 31 * DAY, now + DAY)).map((o) => ({
        dueAt: o.dueAt,
        status: o.status,
        type: o.type,
      }));
      const visits = await listVisits(db, patientId);
      const lastVisitBy = visits[0]?.userId ? await getUser(db, visits[0].userId) : null;
      return {
        now,
        patient: await getPatient(db, patientId),
        sessions,
        occurrences,
        visits,
        ashaName: lastVisitBy?.name ?? null,
        alerts: await listAlerts(db, patientId),
      };
    },
    [patientId],
  );
  useFocusEffect(useCallback(() => reload(), [reload]));

  if (!data?.patient) return <Screen>{null}</Screen>;
  const { now, sessions, occurrences, visits } = data;
  const name = displayName(data.patient);
  const date = (ms: number) => formatShortDate(new Date(ms), language);
  const { from } = reportWindow(now);

  const domains = domainSummaries(sessions, now);
  const games = gameRows(sessions, now);
  const weeks = weeklyIndex(sessions, now);
  const reaction = reactionSummary(sessions, now);
  const medicine = adherenceOver(occurrences, 'medicine', now);
  const hydration = adherenceOver(occurrences, 'hydration', now);
  const activity = adherenceOver(occurrences, 'activity', now);
  const checkups = comparableCheckups(visits);
  const lastVisit = visits[0] ?? null;
  const referral = lastVisit?.refer && lastVisit.startedAt >= now - 30 * DAY ? lastVisit : null;

  const changeText = (c: Comparison): { text: string; tone: DeltaTone } | null => {
    if (c.direction == null || c.delta == null) return null;
    if (c.direction === 'down') return { text: t('doctor.down', { n: -c.delta }), tone: 'bad' };
    if (c.direction === 'up') return { text: t('doctor.up', { n: c.delta }), tone: 'good' };
    return { text: t('doctor.steady'), tone: 'neutral' };
  };
  const pct = (r: number | null) => (r == null ? t('progress.kpi.noData') : `${Math.round(r * 100)}%`);
  const secs = (ms: number | null) => (ms == null ? '—' : t('doctor.seconds', { n: (ms / 1000).toFixed(1) }));

  const share = () =>
    Share.share({
      message: summaryText({
        t,
        patient: data.patient!,
        name,
        period: `${date(from)} – ${date(now)}`,
        domains: domains.map((d) => {
          const c = changeText(d);
          return `${t(`doctor.domain.${d.domain}`)}: ${d.recent ?? '—'}${c ? ` (${c.text})` : ''}`;
        }),
        medicine: medicine.decided
          ? t('doctor.shareMedicine', { taken: medicine.taken, decided: medicine.decided, pct: pct(medicine.rate) })
          : null,
        checkup: checkups[0]
          ? t('doctor.shareCheckup', { score: checkups[0].checkupScore, date: date(checkups[0].startedAt) })
          : null,
        referral: referral
          ? t('doctor.referredBy', { name: data.ashaName ?? t('roles.asha'), date: date(referral.startedAt) })
          : null,
        alerts: data.alerts,
      }),
    }).catch(() => {});

  return (
    <Screen>
      <TopBar />
      <AppText variant="title">{t('doctor.title')}</AppText>
      <PatientCard patient={data.patient} showNotes />
      {cloud ? (
        <ListGroup>
          <ListRow
            icon="users"
            tone="pond"
            title={t('people.button')}
            subtitle={t('people.rowHint', { name })}
            onPress={() => router.push({ pathname: '/doctor/people', params: { patientId } })}
          />
        </ListGroup>
      ) : null}
      <AppText tone="muted">{t('doctor.period', { from: date(from), to: date(now) })}</AppText>

      <Tabs
        tabs={[
          { key: 'summary', label: t('doctor.tab.summary') },
          { key: 'games', label: t('doctor.tab.games') },
          { key: 'care', label: t('doctor.tab.care') },
          { key: 'notes', label: t('notes.tab') },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'summary' && referral ? (
        <View style={styles.referral}>
          <CardTitle
            icon="stethoscope"
            color={colors.warning}
            text={t('doctor.referredBy', { name: data.ashaName ?? t('roles.asha'), date: date(referral.startedAt) })}
          />
          {concerns(referral.observations).map((k) => (
            <AppText key={k} variant="small">
              • {t(`visit.obs.${k}.short`)}: {t(`visit.obs.${k}.${referral.observations[k]}`)}
            </AppText>
          ))}
          {referral.note ? (
            <View style={styles.noteRow}>
              <Icon name="note" size={18} color={colors.textMuted} />
              <AppText variant="small" style={styles.flex}>
                {referral.note}
              </AppText>
            </View>
          ) : null}
        </View>
      ) : null}

      {tab === 'summary' && data.alerts.length ? (
        <AppText variant="large" weight="bold">
          {t('doctor.alertsTitle')} ({data.alerts.length})
        </AppText>
      ) : null}
      {tab === 'summary' ? data.alerts.map((a) => <AlertCard key={a.id} alert={a} patientName={name} compact />) : null}

      {tab === 'summary' ? (
        <>
          <AppText variant="large" bold>
            {t('doctor.domainsTitle')}
          </AppText>
          {domains.length === 0 ? <AppText tone="muted">{t('doctor.noGames')}</AppText> : null}
          <View style={styles.tiles}>
            {domains.map((d) => (
              <StatTile
                key={d.domain}
                label={t(`doctor.domain.${d.domain}`)}
                value={d.recent == null ? '—' : String(d.recent)}
                delta={changeText(d) ?? { text: t('doctor.notEnough'), tone: 'neutral' }}
                caption={d.games.map((g) => t(`games.${g}.title`)).join(' · ')}
              />
            ))}
          </View>

          <ChartCard
            title={t('doctor.weeklyTitle')}
            subtitle={t('doctor.weeklySubtitle')}
            showTableLabel={t('progress.table.show')}
            showChartLabel={t('progress.table.chart')}
            tableHeader={[t('doctor.week'), t('doctor.index')]}
            table={[...weeks]
              .reverse()
              .map((w) => [formatDayMonth(new Date(w.weekStart), language), w.index == null ? '—' : String(w.index)])}
          >
            <LineChart
              points={weeks.map((w) => ({ label: formatDayMonth(new Date(w.weekStart), language), value: w.index }))}
              max={100}
              emptyText={t('doctor.noGames')}
              readout={(p, i) =>
                p.value == null
                  ? t('doctor.weekNone', { date: p.label })
                  : t('doctor.weekReadout', { date: p.label, index: p.value, count: weeks[i].sessions })
              }
            />
          </ChartCard>
        </>
      ) : null}

      {tab === 'games' ? (
        <>
          <AppText variant="large" bold>
            {t('doctor.gamesTitle')}
          </AppText>
          <View style={styles.table}>
            <View style={[styles.tr, styles.th]}>
              <AppText variant="caption" bold style={styles.cGame}>
                {t('doctor.col.game')}
              </AppText>
              <AppText variant="caption" bold style={styles.cNum}>
                {t('doctor.col.sessions')}
              </AppText>
              <AppText variant="caption" bold style={styles.cNum}>
                {t('doctor.col.level')}
              </AppText>
              <AppText variant="caption" bold style={styles.cTrend}>
                {t('doctor.col.change')}
              </AppText>
            </View>
            {games.map((g) => {
              const c = changeText(g);
              return (
                <View key={g.gameId} style={styles.tr}>
                  <View style={[styles.cGame, styles.gameCell]}>
                    <Picture glyph={GAMES.find((x) => x.id === g.gameId)?.icon} size={22} />
                    <AppText variant="small" style={styles.flex}>
                      {t(`games.${g.gameId}.title`)}
                    </AppText>
                  </View>
                  <AppText variant="small" style={[styles.cNum, styles.num]}>
                    {g.sessions}
                  </AppText>
                  <AppText variant="small" style={[styles.cNum, styles.num]}>
                    {g.level}
                  </AppText>
                  <AppText
                    variant="small"
                    bold={c?.tone === 'bad'}
                    style={[styles.cTrend, c?.tone === 'bad' && { color: colors.warning }]}
                  >
                    {c ? c.text : '—'}
                  </AppText>
                </View>
              );
            })}
          </View>

          {reaction.sessions ? (
            <View style={styles.card}>
              <CardTitle icon="clock" text={t('doctor.reactionTitle')} />
              <AppText variant="small">
                {t('doctor.reaction', { recent: secs(reaction.recentMs), previous: secs(reaction.previousMs) })}
              </AppText>
            </View>
          ) : null}
        </>
      ) : null}

      {tab === 'care' ? (
        <>
          <View style={styles.card}>
            <CardTitle icon="bell" text={t('doctor.remindersTitle')} />
            {[
              ['medicine', medicine],
              ['hydration', hydration],
              ['activity', activity],
            ]
              .filter(([, a]) => (a as typeof medicine).decided > 0)
              .map(([type, a]) => {
                const ad = a as typeof medicine;
                return (
                  <Meter
                    key={type as string}
                    label={t(`reminders.type.${type}`)}
                    ratio={ad.rate ?? 0}
                    valueText={`${pct(ad.rate)} · ${ad.taken}/${ad.decided}`}
                  />
                );
              })}
            {medicine.decided + hydration.decided + activity.decided === 0 ? (
              <AppText variant="small" tone="muted">
                {t('progress.kpi.noData')}
              </AppText>
            ) : null}
          </View>

          <View style={styles.card}>
            <CardTitle icon="house" text={t('doctor.checkupsTitle')} />
            {checkups.length === 0 ? (
              <AppText variant="small" tone="muted">
                {t('doctor.noCheckups')}
              </AppText>
            ) : null}
            {checkups.slice(0, 5).map((v) => (
              <AppText key={v.id} variant="small">
                {date(v.startedAt)} · {t('visit.scoreLine', { score: v.checkupScore })}
              </AppText>
            ))}
          </View>
        </>
      ) : null}

      {tab === 'notes' ? <DoctorNotes patientId={patientId} canWrite limit={5} /> : null}

      <BigButton icon="share" label={t('doctor.share')} onPress={share} />

      <View style={styles.about}>
        <BigButton
          kind="ghost"
          icon={showHow ? 'caret-left' : 'info'}
          label={t('doctor.howTitle')}
          onPress={() => setShowHow(!showHow)}
        />
        {showHow ? (
          <AppText variant="small" tone="muted">
            {t('doctor.how')}
          </AppText>
        ) : null}
        <AppText variant="small" tone="muted">
          {t('doctor.disclaimer')}
        </AppText>
      </View>
    </Screen>
  );
}

function summaryText(args: {
  t: (key: string, opts?: Record<string, unknown>) => string;
  patient: Patient;
  name: string;
  period: string;
  domains: string[];
  medicine: string | null;
  checkup: string | null;
  referral: string | null;
  alerts: StoredAlert[];
}) {
  const { t, patient } = args;
  const who = [patient.name, patient.age != null ? t('staff.years', { count: patient.age }) : null, patient.village]
    .filter(Boolean)
    .join(', ');
  return [
    t('doctor.shareTitle'),
    who,
    t('doctor.sharePeriod', { period: args.period }),
    '',
    ...args.domains,
    args.medicine,
    args.checkup,
    args.referral,
    ...args.alerts.map((a) => `⚠️ ${alertTitle(t, a)}`),
    '',
    t('doctor.disclaimer'),
  ]
    .filter((line) => line != null)
    .join('\n');
}

/** Icon + bold heading inside a report card. */
function CardTitle({ icon, text, color = colors.text }: { icon: IconName; text: string; color?: string }) {
  return (
    <View style={styles.cardTitle}>
      <Icon name={icon} size={20} color={color} />
      <AppText weight="bold" style={[styles.flex, { color }]}>
        {text}
      </AppText>
    </View>
  );
}

/** Plain title for the shared text (the hook version needs a component). */
function alertTitle(t: (key: string, opts?: Record<string, unknown>) => string, a: StoredAlert) {
  if (a.kind === 'game_decline') return t('alerts.game_decline.title', { game: t(`games.${a.detail.gameId}.title`) });
  if (a.kind === 'adherence_low') return t('alerts.adherence_low.title');
  return t('alerts.inactive.title', { days: a.detail.days });
}

const styles = StyleSheet.create({
  referral: { gap: space.xs + 2, padding: space.md, borderRadius: radius.md, backgroundColor: colors.warningSoft },
  cardTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  gameCell: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  flex: { flex: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  card: {
    gap: space.sm,
    padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    boxShadow: shadow.card,
  },
  table: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    boxShadow: shadow.card,
    paddingHorizontal: space.sm,
  },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  th: { borderBottomWidth: 1 },
  cGame: { flex: 3 },
  cNum: { flex: 1, textAlign: 'right' },
  cTrend: { flex: 2.4, textAlign: 'right' },
  num: { fontVariant: ['tabular-nums'] },
  about: { gap: space.xs, padding: space.md, backgroundColor: colors.surfaceMuted, borderRadius: radius.md },
});
