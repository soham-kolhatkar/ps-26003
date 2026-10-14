import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AlertCard } from '@/components/AlertCard';
import { DoctorNotes } from '@/components/DoctorNotes';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { ChartCard } from '@/components/charts/ChartCard';
import { ColumnChart } from '@/components/charts/ColumnChart';
import { LineChart } from '@/components/charts/LineChart';
import { Meter } from '@/components/charts/Meter';
import { StatTile, type DeltaTone } from '@/components/charts/StatTile';
import { Screen } from '@/components/Screen';
import { listAlerts } from '@/db/repos/alerts';
import { listSessions } from '@/db/repos/games';
import { displayName, getPatient } from '@/db/repos/patients';
import { ensureEvents, listOccurrences } from '@/db/repos/reminders';
import { useDbQuery } from '@/db/useDbQuery';
import {
  activitySummary,
  adherenceByType,
  comparableDelta,
  dailyAdherence,
  dailyScores,
  gameSummary,
  trendOf,
  type SessionPoint,
} from '@/engine/progress';
import { eventState, MISSED_AFTER_MS, startOfDay } from '@/engine/reminders';
import { GAMES } from '@/games/registry';
import { formatDayMonth, formatShortDate, formatTime } from '@/services/datetime';
import { refreshAlerts } from '@/services/alerts';
import { REMINDER_ICON } from '@/services/notifications';
import { useSettings } from '@/store/settings';
import { colors, radius, space } from '@/theme/tokens';

const DAY = 24 * 60 * 60 * 1000;
type Period = 7 | 30;

export default function ProgressDashboard() {
  const { t } = useTranslation();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const language = useSettings((s) => s.language);
  const [period, setPeriod] = useState<Period>(7);

  const { data, reload } = useDbQuery(
    async (db) => {
      const now = Date.now();
      const today = startOfDay(now);
      await ensureEvents(db, patientId, today, today + DAY);
      // Two windows of the longest period, so "vs previous period" always has data.
      const since = today - 60 * DAY;
      const sessions: SessionPoint[] = (await listSessions(db, patientId, { since, limit: 2000 })).map((s) => ({
        gameId: s.gameId,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        level: s.level,
        score: s.stats.score,
        completed: s.completed,
      }));
      const occurrences = await listOccurrences(db, patientId, since, today + DAY);
      await refreshAlerts(db, patientId, now);
      const alerts = await listAlerts(db, patientId);
      return { now, patient: await getPatient(db, patientId), sessions, occurrences, alerts };
    },
    [patientId],
  );
  useFocusEffect(useCallback(() => reload(), [reload]));

  if (!data?.patient) return <Screen>{null}</Screen>;
  const { now, sessions, occurrences } = data;
  const name = displayName(data.patient);
  const day = (ms: number) => formatDayMonth(new Date(ms), language);
  const fmtScore = (v: number | null) => (v == null ? t('progress.kpi.noData') : String(Math.round(v)));
  const fmtPct = (r: number | null) => (r == null ? t('progress.kpi.noData') : `${Math.round(r * 100)}%`);

  // ---- metrics for the selected period (pure engine) ----
  const activity = activitySummary(sessions, period, now);
  const windowStart = startOfDay(now) - (period - 1) * DAY;
  // Same-length window ending just before the current one.
  const prevActivity = activitySummary(sessions, period, windowStart - 1);
  const scoreDelta = comparableDelta(activity.scores, prevActivity.scores);
  const scores = dailyScores(sessions, period, now);
  const periodOcc = occurrences.filter((o) => o.dueAt >= windowStart);
  const adherenceDays = dailyAdherence(periodOcc, period, now);
  const decided = adherenceDays.reduce((n, d) => n + d.decided, 0);
  const taken = adherenceDays.reduce((n, d) => n + d.taken, 0);
  const byType = adherenceByType(periodOcc, now);

  const deltaText = (delta: number | null): { text: string; tone: DeltaTone } => {
    const trend = trendOf(delta);
    if (trend == null || delta == null) return { text: t('progress.delta.none'), tone: 'neutral' };
    const n = Math.abs(Math.round(delta));
    if (trend === 'up') return { text: t('progress.delta.up', { n, d: period }), tone: 'good' };
    if (trend === 'down') return { text: t('progress.delta.down', { n, d: period }), tone: 'bad' };
    return { text: t('progress.delta.steady', { d: period }), tone: 'neutral' };
  };

  // ---- recent activity timeline ----
  type Item = { at: number; text: string; icon: string };
  const recent: Item[] = [
    ...sessions
      .filter((s) => s.completed)
      .map((s) => ({
        at: s.endedAt ?? s.startedAt,
        icon: GAMES.find((g) => g.id === s.gameId)?.icon ?? '🎲',
        text: t('progress.recent.game', { game: t(`games.${s.gameId}.title`), score: Math.round(s.score) }),
      })),
    ...occurrences.flatMap((o): Item[] => {
      const st = eventState(o.status, o.dueAt, now);
      if (st === 'taken')
        return [
          {
            at: o.actedAt ?? o.dueAt,
            icon: REMINDER_ICON[o.type],
            text: t('progress.recent.taken', { title: o.title }),
          },
        ];
      if (st === 'missed')
        return [{ at: o.dueAt + MISSED_AFTER_MS, icon: '⚠️', text: t('progress.recent.missed', { title: o.title }) }];
      return [];
    }),
  ]
    .filter((i) => i.at <= now)
    .sort((a, b) => b.at - a.at)
    .slice(0, 8);

  return (
    <Screen>
      <BigButton kind="ghost" icon="⬅️" label={t('common.back')} onPress={() => router.back()} />
      <AppText variant="title">{t('progress.title', { name })}</AppText>

      {/* Trend alerts first: they are the reason to open this screen. */}
      {data.alerts.slice(0, 2).map((a) => (
        <AlertCard key={a.id} alert={a} patientName={name} compact />
      ))}
      {data.alerts.length ? (
        <BigButton
          kind="secondary"
          icon="⚠️"
          label={t('alerts.seeAll', { count: data.alerts.length })}
          onPress={() => router.push({ pathname: '/caregiver/alerts', params: { patientId } })}
        />
      ) : null}

      {/* The doctor's latest advice, if any (F18). */}
      <DoctorNotes patientId={patientId} limit={2} />

      {/* One filter row, above everything it scopes. */}
      <View style={styles.filters}>
        {([7, 30] as const).map((p) => (
          <Pressable
            key={p}
            accessibilityRole="button"
            accessibilityState={{ selected: period === p }}
            onPress={() => setPeriod(p)}
            style={[styles.chip, period === p && styles.chipOn]}
          >
            <AppText variant="small" bold tone={period === p ? 'onPrimary' : 'primary'}>
              {period === p ? '✓ ' : ''}
              {t(p === 7 ? 'progress.last7' : 'progress.last30')}
            </AppText>
          </Pressable>
        ))}
      </View>

      <View style={styles.kpis}>
        <StatTile
          label={t('progress.kpi.sessions')}
          value={String(activity.sessions)}
          caption={t('progress.kpi.minutes', { n: activity.minutes })}
        />
        <StatTile
          label={t('progress.kpi.activeDays')}
          value={t('progress.kpi.activeDaysValue', { n: activity.activeDays, d: period })}
        />
        <StatTile
          label={t('progress.kpi.avgScore')}
          value={fmtScore(activity.avgScore)}
          delta={deltaText(scoreDelta)}
        />
        <StatTile
          label={t('progress.kpi.remindersTaken')}
          value={fmtPct(decided ? taken / decided : null)}
          caption={decided ? `${taken} / ${decided}` : undefined}
        />
      </View>

      <ChartCard
        title={t('progress.score.title')}
        subtitle={t('progress.score.subtitle')}
        showTableLabel={t('progress.table.show')}
        showChartLabel={t('progress.table.chart')}
        tableHeader={[t('progress.table.day'), t('progress.table.score')]}
        table={[...scores].reverse().map((d) => [formatShortDate(new Date(d.day), language), fmtScore(d.avgScore)])}
      >
        <LineChart
          points={scores.map((d) => ({ label: day(d.day), value: d.avgScore }))}
          max={100}
          emptyText={t('progress.score.empty')}
          readout={(p, i) =>
            p.value == null
              ? t('progress.score.readoutNone', { date: p.label })
              : t('progress.score.readout', { date: p.label, score: Math.round(p.value), count: scores[i].sessions })
          }
        />
      </ChartCard>

      <AppText variant="large" bold>
        {t('progress.games.title')}
      </AppText>
      <View style={styles.kpis}>
        {GAMES.map((g) => {
          const s = gameSummary(sessions, g.id, period, now);
          const trendWord =
            s.trend === 'up'
              ? t('progress.games.up')
              : s.trend === 'down'
                ? t('progress.games.down')
                : s.trend === 'steady'
                  ? t('progress.games.steady')
                  : null;
          return (
            <StatTile
              key={g.id}
              icon={g.icon}
              label={t(`games.${g.id}.title`)}
              value={fmtScore(s.avgScore)}
              delta={
                trendWord
                  ? { text: trendWord, tone: s.trend === 'up' ? 'good' : s.trend === 'down' ? 'bad' : 'neutral' }
                  : null
              }
              caption={
                s.sessions
                  ? [
                      t('progress.games.sessions', { count: s.sessions }),
                      s.lastLevel ? t('progress.games.level', { level: s.lastLevel }) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : t('progress.games.never')
              }
              trend={s.recent.length > 1 ? s.recent : undefined}
            />
          );
        })}
      </View>

      <ChartCard
        title={t('progress.reminders.title')}
        subtitle={t('progress.reminders.subtitle')}
        showTableLabel={t('progress.table.show')}
        showChartLabel={t('progress.table.chart')}
        tableHeader={[t('progress.table.day'), t('progress.table.taken')]}
        table={[...adherenceDays]
          .reverse()
          .map((d) => [formatShortDate(new Date(d.day), language), d.decided ? `${d.taken} / ${d.decided}` : '—'])}
      >
        <ColumnChart
          columns={adherenceDays.map((d) => ({ label: day(d.day), value: d.rate == null ? null : d.rate * 100 }))}
          max={100}
          format={(v) => `${Math.round(v)}%`}
          emptyText={t('progress.reminders.empty')}
          readout={(_, i) => {
            const d = adherenceDays[i];
            return d.decided
              ? t('progress.reminders.readout', { date: day(d.day), taken: d.taken, decided: d.decided })
              : t('progress.reminders.readoutNone', { date: day(d.day) });
          }}
        />
        {byType.length ? (
          <View style={styles.byType}>
            <AppText variant="small" bold>
              {t('progress.reminders.byType')}
            </AppText>
            {byType.map((b) => (
              <Meter
                key={b.type}
                label={`${REMINDER_ICON[b.type]} ${t(`reminders.type.${b.type}`)}`}
                ratio={b.rate ?? 0}
                valueText={`${fmtPct(b.rate)} · ${b.taken}/${b.decided}`}
              />
            ))}
          </View>
        ) : null}
      </ChartCard>

      <View style={styles.card}>
        <AppText variant="large" bold>
          {t('progress.recent.title')}
        </AppText>
        {recent.length === 0 ? <AppText tone="muted">{t('progress.recent.empty')}</AppText> : null}
        {recent.map((r, i) => (
          <View key={i} style={styles.recentRow}>
            <AppText variant="body" importantForAccessibility="no">
              {r.icon}
            </AppText>
            <View style={styles.flex}>
              <AppText variant="small">{r.text}</AppText>
              <AppText variant="caption" tone="muted">
                {formatShortDate(new Date(r.at), language)} · {formatTime(new Date(r.at), language)}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <AppText variant="caption" tone="muted">
        ℹ️ {t('progress.disclaimer')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: space.sm },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  byType: { gap: space.sm, marginTop: space.sm },
  card: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recentRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  flex: { flex: 1 },
});
