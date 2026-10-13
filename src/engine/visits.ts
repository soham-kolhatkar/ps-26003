/**
 * ASHA home visits (F12): observation checklist, visit scheduling and the
 * fixed-difficulty check-up. Pure and unit-tested.
 */
import { computeSessionStats, type Trial } from './scoring';
import { startOfDay } from './reminders';

const DAY = 24 * 60 * 60 * 1000;

/** What the ASHA worker notes at every visit, with the answers she can tap. */
export const OBSERVATIONS = {
  sleep: ['good', 'fair', 'poor'],
  mood: ['good', 'fair', 'low'],
  appetite: ['good', 'fair', 'poor'],
  medicines: ['yes', 'sometimes', 'no', 'none'],
  falls: ['no', 'yes'],
  confusion: ['none', 'sometimes', 'often'],
} as const;

export type ObservationKey = keyof typeof OBSERVATIONS;
export type Observations = { [K in ObservationKey]?: (typeof OBSERVATIONS)[K][number] };
export const OBSERVATION_KEYS = Object.keys(OBSERVATIONS) as ObservationKey[];

/** Answers worth a second look (shown highlighted, and they shorten the time to the next visit). */
const CONCERNING: { [K in ObservationKey]: readonly string[] } = {
  sleep: ['poor'],
  mood: ['low'],
  appetite: ['poor'],
  medicines: ['sometimes', 'no'],
  falls: ['yes'],
  confusion: ['often'],
};

export function isConcerning(key: ObservationKey, value: string | undefined): boolean {
  return value != null && CONCERNING[key].includes(value);
}

export function concerns(obs: Observations): ObservationKey[] {
  return OBSERVATION_KEYS.filter((k) => isConcerning(k, obs[k]));
}

export const DEFAULT_VISIT_INTERVAL_DAYS = 14;
export const SOON_VISIT_INTERVAL_DAYS = 7;
export const VISIT_INTERVAL_CHOICES = [7, 14, 30] as const;

/** Sooner when something needs watching: a serious alert, a referral, or two worrying answers. */
export function suggestNextVisitDays(args: { seriousAlerts: number; refer: boolean; concernCount: number }): number {
  return args.seriousAlerts > 0 || args.refer || args.concernCount >= 2
    ? SOON_VISIT_INTERVAL_DAYS
    : DEFAULT_VISIT_INTERVAL_DAYS;
}

export type VisitState = 'never' | 'ok' | 'due' | 'overdue';
export type VisitStatus = {
  state: VisitState;
  /** Days until (ok) or since (overdue) the next visit date. */ days: number;
  nextAt: number | null;
};

export function visitStatus(last: { startedAt: number; nextVisitAt: number | null } | null, now: number): VisitStatus {
  if (!last) return { state: 'never', days: 0, nextAt: null };
  const nextAt = last.nextVisitAt ?? last.startedAt + DEFAULT_VISIT_INTERVAL_DAYS * DAY;
  const days = Math.round((startOfDay(nextAt) - startOfDay(now)) / DAY);
  if (days > 0) return { state: 'ok', days, nextAt };
  if (days === 0) return { state: 'due', days: 0, nextAt };
  return { state: 'overdue', days: -days, nextAt };
}

/** Visit-list priority: overdue first (longest first), then due today, then never visited, then scheduled. */
export function visitUrgency(s: VisitStatus): number {
  if (s.state === 'overdue') return 1000 + s.days;
  if (s.state === 'due') return 500;
  if (s.state === 'never') return 100;
  return -s.days;
}

// ---- check-up ----

export type CheckupGameId = 'orientation' | 'word_recall' | 'reaction_tap';

/**
 * The 5-minute check-up: always the same tasks at the same difficulty, so
 * scores can be compared from visit to visit (unlike everyday play, which
 * adapts). Results are stored with the visit, never as game sessions, so they
 * don't move the patient's levels or trends.
 */
export const CHECKUP_STEPS: readonly {
  gameId: CheckupGameId;
  level: number;
  trials: number;
  targetReactionMs: number;
}[] = [
  { gameId: 'orientation', level: 1, trials: 3, targetReactionMs: 8000 },
  // `trials` = lists to remember (one list of 3 pictures at level 2).
  { gameId: 'word_recall', level: 2, trials: 1, targetReactionMs: 5000 },
  { gameId: 'reaction_tap', level: 2, trials: 6, targetReactionMs: 1500 },
];

export type CheckupTask = {
  gameId: CheckupGameId;
  level: number;
  /** null when the ASHA worker skipped the task (e.g. the patient was tired). */
  score: number | null;
  trials: number;
  correct: number;
  avgReactionMs: number | null;
};

export function checkupTask(step: (typeof CHECKUP_STEPS)[number], trials: readonly Trial[] | null): CheckupTask {
  if (trials == null || trials.length === 0) {
    return { gameId: step.gameId, level: step.level, score: null, trials: 0, correct: 0, avgReactionMs: null };
  }
  const stats = computeSessionStats(trials, step.targetReactionMs);
  return {
    gameId: step.gameId,
    level: step.level,
    score: stats.score,
    trials: stats.trials,
    correct: stats.correct,
    avgReactionMs: stats.avgReactionMs == null ? null : Math.round(stats.avgReactionMs),
  };
}

/** Mean of the tasks that were done; null if all were skipped. */
export function checkupScore(tasks: readonly CheckupTask[]): number | null {
  const done = tasks.map((t) => t.score).filter((s): s is number => s != null);
  return done.length ? Math.round(done.reduce((a, b) => a + b, 0) / done.length) : null;
}

/** All tasks done: only complete check-ups are compared with each other (a partial one isn't comparable). */
export function isCompleteCheckup(tasks: readonly CheckupTask[] | null): boolean {
  return tasks != null && tasks.length === CHECKUP_STEPS.length && tasks.every((t) => t.score != null);
}

/** Visits with a complete check-up, in the given order (newest first from the repo). */
export function comparableCheckups<V extends { checkup: CheckupTask[] | null; checkupScore: number | null }>(
  visits: readonly V[],
): V[] {
  return visits.filter((v) => v.checkupScore != null && isCompleteCheckup(v.checkup));
}

/** A change of at least this many points between two check-ups is worth mentioning. */
export const CHECKUP_CHANGE_POINTS = 8;
