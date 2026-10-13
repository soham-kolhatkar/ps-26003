/**
 * Pure progress metrics for the caregiver dashboard (and later ASHA/doctor).
 * Inputs are plain rows; "now" is injected so everything is testable.
 * Wording in the UI: activity / performance trends — never diagnosis.
 */
import { eventState, startOfDay, type EventStatus, type ReminderType } from './reminders';

const DAY = 24 * 60 * 60 * 1000;

export type SessionPoint = {
  gameId: string;
  startedAt: number;
  endedAt: number | null;
  level: number;
  score: number;
  completed: boolean;
};

/** Local-midnight starts of the last `days` days, oldest first, ending today. */
export function dayStarts(days: number, now: number): number[] {
  const today = startOfDay(now);
  return Array.from({ length: days }, (_, i) => startOfDay(today - (days - 1 - i) * DAY + DAY / 2));
}

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const inDay = (t: number, day: number) => t >= day && t < startOfDay(day + DAY + DAY / 2);

export type DayScore = { day: number; sessions: number; avgScore: number | null };

/** Average completed-session score per day (null on days without play). */
export function dailyScores(sessions: readonly SessionPoint[], days: number, now: number, gameId?: string): DayScore[] {
  const done = sessions.filter((s) => s.completed && (!gameId || s.gameId === gameId));
  return dayStarts(days, now).map((day) => {
    const scores = done.filter((s) => inDay(s.startedAt, day)).map((s) => s.score);
    return { day, sessions: scores.length, avgScore: mean(scores) };
  });
}

export type Trend = 'up' | 'down' | 'steady';
/** Score points of change that count as a real move (smaller is noise). */
export const TREND_THRESHOLD = 3;
/** Fewer sessions than this in either window → no comparison (too little data to call a trend). */
export const MIN_SESSIONS_FOR_TREND = 3;

/** Difference of means, or null when either side has too few sessions. */
export function comparableDelta(current: readonly number[], previous: readonly number[]): number | null {
  if (current.length < MIN_SESSIONS_FOR_TREND || previous.length < MIN_SESSIONS_FOR_TREND) return null;
  return mean(current)! - mean(previous)!;
}

export function trendOf(delta: number | null): Trend | null {
  if (delta == null) return null;
  if (delta >= TREND_THRESHOLD) return 'up';
  if (delta <= -TREND_THRESHOLD) return 'down';
  return 'steady';
}

export type GameSummary = {
  gameId: string;
  sessions: number;
  avgScore: number | null;
  /** Same-length window just before the current one. */
  prevAvgScore: number | null;
  delta: number | null;
  trend: Trend | null;
  lastPlayed: number | null;
  lastLevel: number | null;
  /** Daily averages over the current window (for tables/charts). */
  series: (number | null)[];
  /** Scores of the last 12 completed sessions, oldest first (stat-tile sparkline). */
  recent: number[];
};

export const SPARKLINE_POINTS = 12;

function windowScores(sessions: readonly SessionPoint[], from: number, to: number): number[] {
  return sessions.filter((s) => s.completed && s.startedAt >= from && s.startedAt < to).map((s) => s.score);
}

export function gameSummary(sessions: readonly SessionPoint[], gameId: string, days: number, now: number): GameSummary {
  const mine = sessions.filter((s) => s.gameId === gameId);
  const from = dayStarts(days, now)[0];
  const prevFrom = startOfDay(from - days * DAY + DAY / 2);
  const current = windowScores(mine, from, now + 1);
  const previous = windowScores(mine, prevFrom, from);
  const avgScore = mean(current);
  const prevAvgScore = mean(previous);
  const delta = comparableDelta(current, previous);
  const completed = mine.filter((s) => s.completed).sort((a, b) => b.startedAt - a.startedAt);
  return {
    gameId,
    sessions: current.length,
    avgScore,
    prevAvgScore,
    delta,
    trend: trendOf(delta),
    lastPlayed: completed[0]?.startedAt ?? null,
    lastLevel: completed[0]?.level ?? null,
    series: dailyScores(mine, days, now).map((d) => d.avgScore),
    recent: completed
      .filter((s) => s.startedAt <= now)
      .slice(0, SPARKLINE_POINTS)
      .reverse()
      .map((s) => s.score),
  };
}

export type ActivitySummary = {
  sessions: number;
  /** Completed-session scores in the window (for comparisons). */
  scores: number[];
  activeDays: number;
  days: number;
  minutes: number;
  avgScore: number | null;
};

export function activitySummary(sessions: readonly SessionPoint[], days: number, now: number): ActivitySummary {
  const from = dayStarts(days, now)[0];
  const inWindow = sessions.filter((s) => s.startedAt >= from && s.startedAt <= now);
  const completed = inWindow.filter((s) => s.completed);
  const active = new Set(inWindow.map((s) => startOfDay(s.startedAt)));
  const ms = inWindow.reduce((sum, s) => sum + Math.max(0, (s.endedAt ?? s.startedAt) - s.startedAt), 0);
  return {
    sessions: completed.length,
    scores: completed.map((s) => s.score),
    activeDays: active.size,
    days,
    minutes: Math.round(ms / 60000),
    avgScore: mean(completed.map((s) => s.score)),
  };
}

export type OccurrencePoint = { dueAt: number; status: EventStatus; type: ReminderType };

export type DayAdherence = {
  day: number;
  taken: number;
  missed: number;
  skipped: number;
  decided: number;
  rate: number | null;
};

/** Per-day share of decided reminders that were taken (upcoming/still-due excluded). */
export function dailyAdherence(occ: readonly OccurrencePoint[], days: number, now: number): DayAdherence[] {
  return dayStarts(days, now).map((day) => {
    let taken = 0;
    let missed = 0;
    let skipped = 0;
    for (const o of occ) {
      if (!inDay(o.dueAt, day)) continue;
      const s = eventState(o.status, o.dueAt, now);
      if (s === 'taken') taken++;
      else if (s === 'missed') missed++;
      else if (s === 'skipped') skipped++;
    }
    const decided = taken + missed + skipped;
    return { day, taken, missed, skipped, decided, rate: decided ? taken / decided : null };
  });
}

export type TypeAdherence = { type: ReminderType; taken: number; decided: number; rate: number | null };

export function adherenceByType(occ: readonly OccurrencePoint[], now: number): TypeAdherence[] {
  const types: ReminderType[] = ['medicine', 'hydration', 'activity', 'appointment'];
  return types
    .map((type) => {
      let taken = 0;
      let decided = 0;
      for (const o of occ) {
        if (o.type !== type) continue;
        const s = eventState(o.status, o.dueAt, now);
        if (s === 'taken') {
          taken++;
          decided++;
        } else if (s === 'missed' || s === 'skipped') decided++;
      }
      return { type, taken, decided, rate: decided ? taken / decided : null };
    })
    .filter((t) => t.decided > 0);
}
