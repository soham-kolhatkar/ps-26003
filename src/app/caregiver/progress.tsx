import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { DoctorNotes } from '@/components/DoctorNotes';
import { AppText } from '@/components/AppText';
import { Tabs } from '@/components/Tabs';
import { Picture } from '@/components/Picture';
import { Icon } from '@/components/Icon';
import { BigButton } from '@/components/BigButton';
import { TopBar } from '@/components/TopBar';
import { ChartCard } from '@/components/charts/ChartCard';
import { ColumnChart } from '@/components/charts/ColumnChart';
import { Meter } from '@/components/charts/Meter';
import { StatTile } from '@/components/charts/StatTile';
import { StatusLine } from '@/components/StatusLine';
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
import { progressHighlights, type HighlightAlert } from '@/engine/highlights';
import { eventState, MISSED_AFTER_MS, startOfDay } from '@/engine/reminders';
import { GAMES } from '@/games/registry';
import { formatDayMonth, formatShortDate, formatTime } from '@/services/datetime';
import { refreshAlerts } from '@/services/alerts';
import { REMINDER_ICON } from '@/services/notifications';
import { useSettings } from '@/store/settings';
import { colors, radius, shadow, space } from '@/theme/tokens';

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
      await ensureEvents(db, patientId, today - 60 * DAY, today + DAY);
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

  // ---- recent activity timeline ----
  /** `icon: null` = a missed dose (warning icon instead of a picture). */
  type Item = { at: number; text: string; icon: string | null };
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
        return [{ at: o.dueAt + MISSED_AFTER_MS, icon: null, text: t('progress.recent.missed', { title: o.title }) }];
      return [];
    }),
  ]
    .filter((i) => i.at <= now)
    .sort((a, b) => b.at - a.at)
    .slice(0, 8);

  // Only games played in the period get a tile; the rest are named in one line (less to scan).
  const summaries = GAMES.map((g) => ({ g, s: gameSummary(sessions, g.id, period, now) }));
  const played = summaries.filter((x) => x.s.sessions > 0);
  const unplayed = summaries.filter((x) => x.s.sessions === 0);

  const highlights = progressHighlights({
    alerts: data.alerts
      .filter((a) => a.resolvedAt == null)
      .map((a): HighlightAlert =>
        a.kind === 'game_decline'
          ? { kind: 'game_decline', serious: a.severity === 'serious', gameId: String(a.gameId ?? a.detail.gameId) }
          : a.kind === 'adherence_low'
            ? { kind: 'adherence_low', serious: a.severity === 'serious', ratePct: Number(a.detail.ratePct) }
            : { kind: 'inactive', serious: a.severity === 'serious', days: Number(a.detail.days) },
      ),
    sessions: activity.sessions,
    activeDays: activity.activeDays,
    periodDays: period,
    scoreTrend: trendOf(scoreDelta),
    remindersTaken: taken,
    remindersDecided: decided,
  });
  const highlightText = (h: (typeof highlights)[number]) =>
    t(`progress.hl.${h.key}`, {
      ...h.params,
      name,
      game: h.params?.gameId ? t(`games.${h.params.gameId}.title`) : undefined,
    });

  return (
    <Screen>
      <TopBar />
      <AppText variant="title">{t('progress.title', { name })}</AppText>

      {/* The doctor's latest advice, if any (F18). */}
      <DoctorNotes patientId={patientId} limit={2} />

      {/* One filter row, above everything it scopes. */}
      <Tabs
        tabs={[
          { key: '7', label: t('progress.last7') },
          { key: '30', label: t('progress.last30') },
        ]}
        value={String(period) as '7' | '30'}
        onChange={(k) => setPeriod(k === '7' ? 7 : 30)}
      />

      {/* The summary first, in words: the reason to open this screen (D55). */}
      <View style={styles.card} accessibilityLabel={t('progress.hl.title')}>
        {highlights.map((h) => (
          <StatusLine key={h.key} status={h.status} text={highlightText(h)} />
        ))}
        {data.alerts.some((a) => a.resolvedAt == null) ? (
          <BigButton
            kind="ghost"
            icon="caret-right"
            label={t('alerts.seeAll', { count: data.alerts.length })}
            onPress={() => router.push({ pathname: '/caregiver/alerts', params: { patientId } })}
          />
        ) : null}
      </View>

      <View style={styles.kpis}>
        <StatTile
          third
          label={t('progress.kpi.sessions')}
          value={String(activity.sessions)}
          caption={t('progress.kpi.minutes', { n: activity.minutes })}
        />
        <StatTile
          third
          label={t('progress.kpi.activeDays')}
          value={t('progress.kpi.activeDaysValue', { n: activity.activeDays, d: period })}
        />
        <StatTile
          third
          label={t('progress.kpi.remindersTaken')}
          value={fmtPct(decided ? taken / decided : null)}
          caption={decided ? `${taken} / ${decided}` : undefined}
        />
      </View>

      {/* Bars read more easily than lines for families (patient-facing chart review). */}
      <ChartCard
        title={t('progress.daily.title')}
        subtitle={t('progress.daily.subtitle')}
        showTableLabel={t('progress.table.show')}
        showChartLabel={t('progress.table.chart')}
        tableHeader={[t('progress.table.day'), t('progress.table.games')]}
        table={[...scores].reverse().map((d) => [formatShortDate(new Date(d.day), language), String(d.sessions)])}
      >
        <ColumnChart
          columns={scores.map((d) => ({ label: day(d.day), value: d.sessions || null }))}
          max={Math.max(3, ...scores.map((d) => d.sessions))}
          emptyText={t('progress.hl.noGames')}
          readout={(_, i) =>
            scores[i].sessions
              ? t('progress.daily.readout', { date: day(scores[i].day), count: scores[i].sessions })
              : t('progress.daily.readoutNone', { date: day(scores[i].day) })
          }
        />
      </ChartCard>

      {played.length ? (
        <View style={styles.list}>
          <AppText variant="large" weight="bold" style={styles.listTitle}>
            {t('progress.games.title')}
          </AppText>
          {played.map(({ g, s: sum }) => (
            <View key={g.id} style={styles.gameRow}>
              <View style={[styles.gamePicture, { backgroundColor: g.tint }]}>
                <Picture glyph={g.icon} size={30} />
              </View>
              <View style={styles.flex}>
                <AppText variant="body" weight="semibold">
                  {t(`games.${g.id}.title`)}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {[
                    t('progress.games.sessions', { count: sum.sessions }),
                    sum.lastLevel ? t('progress.games.level', { level: sum.lastLevel }) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </AppText>
                {sum.trend ? (
                  <AppText
                    variant="caption"
                    weight="semibold"
                    style={{
                      color:
                        sum.trend === 'down' ? colors.warning : sum.trend === 'up' ? colors.success : colors.textMuted,
                    }}
                  >
                    {t(`progress.games.${sum.trend}`)}
                  </AppText>
                ) : null}
              </View>
              <AppText variant="title" weight="bold">
                {fmtScore(sum.avgScore)}
              </AppText>
            </View>
          ))}
          {unplayed.length ? (
            <AppText variant="caption" tone="muted" style={styles.listFoot}>
              {t('progress.games.notPlayed', { games: unplayed.map((x) => t(`games.${x.g.id}.title`)).join(', ') })}
            </AppText>
          ) : null}
        </View>
      ) : null}

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
                glyph={REMINDER_ICON[b.type]}
                label={t(`reminders.type.${b.type}`)}
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
            {r.icon ? (
              <Picture glyph={r.icon} size={28} />
            ) : (
              <View style={styles.missed}>
                <Icon name="warning" size={20} weight="fill" color={colors.warning} />
              </View>
            )}
            <View style={styles.flex}>
              <AppText variant="small">{r.text}</AppText>
              <AppText variant="caption" tone="muted">
                {formatShortDate(new Date(r.at), language)} · {formatTime(new Date(r.at), language)}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.note}>
        <Icon name="info" size={18} color={colors.textMuted} />
        <AppText variant="caption" tone="muted" style={styles.flex}>
          {t('progress.disclaimer')}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  missed: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  byType: { gap: space.sm, marginTop: space.sm },
  card: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    boxShadow: shadow.card,
  },
  recentRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  flex: { flex: 1 },
  list: { backgroundColor: colors.surface, borderRadius: radius.md, boxShadow: shadow.card, paddingVertical: space.sm },
  listTitle: { paddingHorizontal: space.md, paddingVertical: space.xs },
  listFoot: { paddingHorizontal: space.md, paddingTop: space.xs },
  gameRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 4,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  gamePicture: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
});
