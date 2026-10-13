/**
 * Doctor report (F13): read-only summaries over a patient's own history.
 * Pure and unit-tested. Clinical framing: cognitive *domains* and trends,
 * never a diagnosis or a test score with norms.
 */
import { dayStarts, type OccurrencePoint, type SessionPoint } from './progress';
import { eventState, startOfDay } from './reminders';
import { performanceIndex } from './trends';

const DAY = 24 * 60 * 60 * 1000;

export type Domain = 'memory' | 'attention' | 'executive' | 'recognition';
export const DOMAINS: readonly Domain[] = ['memory', 'attention', 'executive', 'recognition'];

/** Which ability each game mostly exercises (a simplification, explained in the UI). */
export const GAME_DOMAIN: Record<string, Domain> = {
  memory_match: 'memory',
  word_recall: 'memory',
  photo_recall: 'memory',
  reaction_tap: 'attention',
  routine_sequence: 'executive',
  pattern: 'executive',
  object_recognition: 'recognition',
  odd_one_out: 'recognition',
};

export const REPORT_DAYS = 30;
/** Fewer completed sessions than this on either side → no comparison. */
export const MIN_SESSIONS = 3;
/** Index points that count as a real change in the report. */
export const REPORT_CHANGE_POINTS = 5;

export type ReportSession = SessionPoint & { avgReactionMs: number | null };
export type Direction = 'up' | 'down' | 'steady';

export type Comparison = {
  /** Mean performance index, last half of the period. */
  recent: number | null;
  /** Mean performance index, first half of the period. */
  previous: number | null;
  delta: number | null;
  direction: Direction | null;
  sessions: number;
};

/** Report period and its midpoint: "last 2 weeks vs the 2 weeks before" for 30 days. */
export function reportWindow(now: number, days = REPORT_DAYS): { from: number; mid: number } {
  const from = dayStarts(days, now)[0];
  const mid = startOfDay(from + Math.floor(days / 2) * DAY + DAY / 2);
  return { from, mid };
}

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round = (x: number | null) => (x == null ? null : Math.round(x));

function inPeriod(sessions: readonly ReportSession[], now: number, days: number) {
  const { from } = reportWindow(now, days);
  return sessions.filter((s) => s.completed && s.startedAt >= from && s.startedAt <= now);
}

export function compare(sessions: readonly ReportSession[], mid: number): Comparison {
  const idx = (s: ReportSession) => performanceIndex(s.level, s.score);
  const recent = sessions.filter((s) => s.startedAt >= mid).map(idx);
  const previous = sessions.filter((s) => s.startedAt < mid).map(idx);
  const enough = recent.length >= MIN_SESSIONS && previous.length >= MIN_SESSIONS;
  const delta = enough ? mean(recent)! - mean(previous)! : null;
  return {
    recent: round(mean(recent)),
    previous: round(mean(previous)),
    delta: round(delta),
    direction:
      delta == null ? null : delta >= REPORT_CHANGE_POINTS ? 'up' : delta <= -REPORT_CHANGE_POINTS ? 'down' : 'steady',
    sessions: recent.length + previous.length,
  };
}

export type DomainSummary = Comparison & { domain: Domain; games: string[] };

/** One row per domain that was played in the period, in DOMAINS order. */
export function domainSummaries(sessions: readonly ReportSession[], now: number, days = REPORT_DAYS): DomainSummary[] {
  const { mid } = reportWindow(now, days);
  const period = inPeriod(sessions, now, days);
  return DOMAINS.flatMap((domain) => {
    const mine = period.filter((s) => GAME_DOMAIN[s.gameId] === domain);
    if (!mine.length) return [];
    return [{ domain, games: [...new Set(mine.map((s) => s.gameId))].sort(), ...compare(mine, mid) }];
  });
}

export type GameRow = Comparison & {
  gameId: string;
  domain: Domain | null;
  avgScore: number | null;
  /** Level of the latest session in the period. */
  level: number;
  avgReactionMs: number | null;
};

/** Per-game breakdown, most-played first. */
export function gameRows(sessions: readonly ReportSession[], now: number, days = REPORT_DAYS): GameRow[] {
  const { mid } = reportWindow(now, days);
  const period = inPeriod(sessions, now, days);
  const games = [...new Set(period.map((s) => s.gameId))];
  return games
    .map((gameId) => {
      const mine = period.filter((s) => s.gameId === gameId).sort((a, b) => a.startedAt - b.startedAt);
      const times = mine.map((s) => s.avgReactionMs).filter((ms): ms is number => ms != null);
      return {
        gameId,
        domain: GAME_DOMAIN[gameId] ?? null,
        avgScore: round(mean(mine.map((s) => s.score))),
        level: mine[mine.length - 1].level,
        avgReactionMs: round(mean(times)),
        ...compare(mine, mid),
      };
    })
    .sort((a, b) => b.sessions - a.sessions || a.gameId.localeCompare(b.gameId));
}

export type WeekPoint = { weekStart: number; index: number | null; sessions: number };

/** Mean performance index per 7-day block ending today, oldest first. */
export function weeklyIndex(sessions: readonly ReportSession[], now: number, weeks = 8): WeekPoint[] {
  const days = dayStarts(weeks * 7, now);
  return Array.from({ length: weeks }, (_, w) => {
    const weekStart = days[w * 7];
    const end = w + 1 < weeks ? days[(w + 1) * 7] : now + 1;
    const mine = sessions.filter((s) => s.completed && s.startedAt >= weekStart && s.startedAt < end);
    return {
      weekStart,
      index: round(mean(mine.map((s) => performanceIndex(s.level, s.score)))),
      sessions: mine.length,
    };
  });
}

export type ReactionSummary = { recentMs: number | null; previousMs: number | null; sessions: number };

/** "Catch the fish" reaction time, last half vs first half of the period (slower = higher). */
export function reactionSummary(sessions: readonly ReportSession[], now: number, days = REPORT_DAYS): ReactionSummary {
  const { mid } = reportWindow(now, days);
  const mine = inPeriod(sessions, now, days).filter((s) => s.gameId === 'reaction_tap' && s.avgReactionMs != null);
  return {
    recentMs: round(mean(mine.filter((s) => s.startedAt >= mid).map((s) => s.avgReactionMs!))),
    previousMs: round(mean(mine.filter((s) => s.startedAt < mid).map((s) => s.avgReactionMs!))),
    sessions: mine.length,
  };
}

export type Adherence = { taken: number; decided: number; rate: number | null };

/** Taken / decided doses of one reminder type over the period. */
export function adherenceOver(
  occurrences: readonly OccurrencePoint[],
  type: OccurrencePoint['type'],
  now: number,
  days = REPORT_DAYS,
): Adherence {
  const { from } = reportWindow(now, days);
  let taken = 0;
  let decided = 0;
  for (const o of occurrences) {
    if (o.type !== type || o.dueAt < from || o.dueAt > now) continue;
    const s = eventState(o.status, o.dueAt, now);
    if (s === 'taken') taken++;
    if (s === 'taken' || s === 'missed' || s === 'skipped') decided++;
  }
  return { taken, decided, rate: decided ? taken / decided : null };
}
