/**
 * Trend detection over a patient's own history (F11). Pure and unit-tested.
 *
 * Wording everywhere: "trend monitoring" / "worth a look" — never diagnosis.
 * Every alert carries the numbers behind it so the UI can explain itself.
 *
 * Why a performance index and not the raw score: the difficulty engine keeps
 * success near 75–80% by moving the level, so a patient who is declining
 * mostly drops *levels* while the score stays similar. The index combines
 * both: ((level − 1) + score / 100) / maxLevel × 100 → 0..100.
 */
import { dayStarts, type OccurrencePoint, type SessionPoint } from './progress';
import { eventState, startOfDay } from './reminders';

const DAY = 24 * 60 * 60 * 1000;

/** Recent window (days, including today) compared with the baseline window just before it. */
export const RECENT_DAYS = 7;
export const BASELINE_DAYS = 21;
export const MIN_RECENT_SESSIONS = 3;
export const MIN_BASELINE_SESSIONS = 5;
/** A decline must be at least this large, both relative and in index points, to count. */
export const DECLINE_PCT = 15;
export const SERIOUS_DECLINE_PCT = 25;
export const MIN_DECLINE_POINTS = 8;

/** Medicine doses: below these taken-rates over the recent window (with enough doses decided). */
export const ADHERENCE_WARNING = 0.7;
export const ADHERENCE_SERIOUS = 0.5;
export const MIN_DOSES = 4;

/** No play for this many days, after a habit of at least MIN_BASELINE_SESSIONS in the baseline window. */
export const INACTIVE_DAYS = 4;

export const DEFAULT_MAX_LEVEL = 5;

export type AlertKind = 'game_decline' | 'adherence_low' | 'inactive';
export type AlertSeverity = 'info' | 'warning' | 'serious';

export type GameDeclineDetail = {
  gameId: string;
  baselineIndex: number;
  recentIndex: number;
  dropPct: number;
  baselineLevel: number;
  recentLevel: number;
  baselineSessions: number;
  recentSessions: number;
};
export type AdherenceDetail = { taken: number; decided: number; ratePct: number; days: number };
export type InactiveDetail = { days: number; lastPlayedAt: number; baselineSessions: number };

export type DetectedAlert =
  | { kind: 'game_decline'; key: string; severity: AlertSeverity; detail: GameDeclineDetail }
  | { kind: 'adherence_low'; key: string; severity: AlertSeverity; detail: AdherenceDetail }
  | { kind: 'inactive'; key: string; severity: AlertSeverity; detail: InactiveDetail };

type AlertOf<K extends AlertKind> = Extract<DetectedAlert, { kind: K }>;

export function performanceIndex(level: number, score: number, maxLevel = DEFAULT_MAX_LEVEL): number {
  const l = Math.min(maxLevel, Math.max(1, level));
  const s = Math.min(100, Math.max(0, score));
  return ((l - 1 + s / 100) / maxLevel) * 100;
}

const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Start of the recent window and of the baseline window before it. */
export function windows(now: number): { recentFrom: number; baselineFrom: number } {
  const recentFrom = dayStarts(RECENT_DAYS, now)[0];
  // + DAY / 2 then startOfDay: safe across daylight-saving shifts.
  const baselineFrom = startOfDay(recentFrom - BASELINE_DAYS * DAY + DAY / 2);
  return { recentFrom, baselineFrom };
}

export function detectGameDecline(
  sessions: readonly SessionPoint[],
  gameId: string,
  now: number,
  maxLevel = DEFAULT_MAX_LEVEL,
): AlertOf<'game_decline'> | null {
  const { recentFrom, baselineFrom } = windows(now);
  const done = sessions.filter((s) => s.completed && s.gameId === gameId && s.startedAt <= now);
  const recent = done.filter((s) => s.startedAt >= recentFrom);
  const baseline = done.filter((s) => s.startedAt >= baselineFrom && s.startedAt < recentFrom);
  if (recent.length < MIN_RECENT_SESSIONS || baseline.length < MIN_BASELINE_SESSIONS) return null;

  const idx = (s: SessionPoint) => performanceIndex(s.level, s.score, maxLevel);
  const baselineIndex = mean(baseline.map(idx));
  const recentIndex = mean(recent.map(idx));
  const drop = baselineIndex - recentIndex;
  const dropPct = baselineIndex > 0 ? (drop / baselineIndex) * 100 : 0;
  if (drop < MIN_DECLINE_POINTS || dropPct < DECLINE_PCT) return null;

  return {
    kind: 'game_decline',
    key: `game_decline:${gameId}`,
    severity: dropPct >= SERIOUS_DECLINE_PCT ? 'serious' : 'warning',
    detail: {
      gameId,
      baselineIndex: Math.round(baselineIndex),
      recentIndex: Math.round(recentIndex),
      dropPct: Math.round(dropPct),
      baselineLevel: Math.round(mean(baseline.map((s) => s.level))),
      recentLevel: Math.round(mean(recent.map((s) => s.level))),
      baselineSessions: baseline.length,
      recentSessions: recent.length,
    },
  };
}

export function detectLowAdherence(
  occurrences: readonly OccurrencePoint[],
  now: number,
): AlertOf<'adherence_low'> | null {
  const { recentFrom } = windows(now);
  let taken = 0;
  let decided = 0;
  for (const o of occurrences) {
    if (o.type !== 'medicine' || o.dueAt < recentFrom || o.dueAt > now) continue;
    const s = eventState(o.status, o.dueAt, now);
    if (s === 'taken') taken++;
    if (s === 'taken' || s === 'missed' || s === 'skipped') decided++;
  }
  if (decided < MIN_DOSES) return null;
  const rate = taken / decided;
  if (rate >= ADHERENCE_WARNING) return null;
  return {
    kind: 'adherence_low',
    key: 'adherence_low',
    severity: rate < ADHERENCE_SERIOUS ? 'serious' : 'warning',
    detail: { taken, decided, ratePct: Math.round(rate * 100), days: RECENT_DAYS },
  };
}

export function detectInactivity(sessions: readonly SessionPoint[], now: number): AlertOf<'inactive'> | null {
  const past = sessions.filter((s) => s.startedAt <= now);
  if (past.length === 0) return null;
  const last = Math.max(...past.map((s) => s.startedAt));
  const days = Math.round((startOfDay(now) - startOfDay(last)) / DAY);
  if (days < INACTIVE_DAYS) return null;
  // Only flag a broken habit: enough play in the 3 weeks before the gap.
  const habitFrom = startOfDay(startOfDay(last) - BASELINE_DAYS * DAY + DAY / 2);
  const baselineSessions = past.filter((s) => s.completed && s.startedAt >= habitFrom).length;
  if (baselineSessions < MIN_BASELINE_SESSIONS) return null;
  return {
    kind: 'inactive',
    key: 'inactive',
    severity: 'info',
    detail: { days, lastPlayedAt: last, baselineSessions },
  };
}

/** All alerts for one patient, most serious first. */
export function detectAlerts(input: {
  sessions: readonly SessionPoint[];
  occurrences: readonly OccurrencePoint[];
  now: number;
  maxLevel?: (gameId: string) => number;
}): DetectedAlert[] {
  const { sessions, occurrences, now } = input;
  const games = [...new Set(sessions.map((s) => s.gameId))].sort();
  const found: DetectedAlert[] = [];
  for (const g of games) {
    const a = detectGameDecline(sessions, g, now, input.maxLevel?.(g) ?? DEFAULT_MAX_LEVEL);
    if (a) found.push(a);
  }
  const adherence = detectLowAdherence(occurrences, now);
  if (adherence) found.push(adherence);
  const inactive = detectInactivity(sessions, now);
  if (inactive) found.push(inactive);
  const rank: Record<AlertSeverity, number> = { serious: 0, warning: 1, info: 2 };
  return found.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
