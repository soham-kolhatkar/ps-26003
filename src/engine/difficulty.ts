/**
 * Adaptive difficulty: a weighted staircase that keeps each patient succeeding
 * most of the time (target ≈ 75–80% first-try accuracy), following the
 * errorless-learning principle used in dementia care.
 *
 * Rules (per patient, per game), using completed sessions at the current level:
 *  1. Rough last session (< 50%)                        → step DOWN now (avoid frustration).
 *  2. Fewer than 2 sessions at this level               → HOLD (warm-up).
 *  3. Weighted accuracy (recent counts more) ≥ 85% and
 *     reaction time not getting worse (≤ +15%)          → step UP.
 *  4. Weighted accuracy < 65%                           → step DOWN.
 *  5. Otherwise                                         → HOLD.
 */
export type SessionOutcome = {
  level: number;
  accuracy: number;
  avgReactionMs: number | null;
};

export type DifficultyConfig = {
  minLevel: number;
  maxLevel: number;
  upAccuracy: number;
  downAccuracy: number;
  rescueAccuracy: number;
  minSessionsToRise: number;
  window: number;
  maxSlowdown: number;
};

export const DEFAULT_DIFFICULTY: DifficultyConfig = {
  minLevel: 1,
  maxLevel: 5,
  upAccuracy: 0.85,
  downAccuracy: 0.65,
  rescueAccuracy: 0.5,
  minSessionsToRise: 2,
  window: 3,
  maxSlowdown: 1.15,
};

export type LevelDecision = {
  level: number;
  change: 'up' | 'down' | 'hold';
  reason: 'rescue' | 'warmup' | 'mastered' | 'struggling' | 'slower' | 'steady' | 'max' | 'min';
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Recency-weighted mean: newest gets weight `n`, oldest weight 1. */
export function weightedAccuracy(newestFirst: readonly SessionOutcome[]): number {
  let sum = 0;
  let weights = 0;
  newestFirst.forEach((s, i) => {
    const w = newestFirst.length - i;
    sum += s.accuracy * w;
    weights += w;
  });
  return weights ? sum / weights : 0;
}

/**
 * @param current level the patient just played at
 * @param recentNewestFirst completed sessions for this game, newest first (any level)
 */
export function nextLevel(
  current: number,
  recentNewestFirst: readonly SessionOutcome[],
  config: Partial<DifficultyConfig> = {},
): LevelDecision {
  const cfg = { ...DEFAULT_DIFFICULTY, ...config };
  const level = clamp(current, cfg.minLevel, cfg.maxLevel);
  const atLevel = recentNewestFirst.filter((s) => s.level === level).slice(0, cfg.window);
  const down = (reason: LevelDecision['reason']): LevelDecision =>
    level > cfg.minLevel ? { level: level - 1, change: 'down', reason } : { level, change: 'hold', reason: 'min' };

  const latest = atLevel[0];
  if (!latest) return { level, change: 'hold', reason: 'warmup' };
  if (latest.accuracy < cfg.rescueAccuracy) return down('rescue');
  if (atLevel.length < cfg.minSessionsToRise) return { level, change: 'hold', reason: 'warmup' };

  const acc = weightedAccuracy(atLevel);
  if (acc >= cfg.upAccuracy) {
    if (level >= cfg.maxLevel) return { level, change: 'hold', reason: 'max' };
    const times = atLevel.map((s) => s.avgReactionMs).filter((ms): ms is number => ms != null);
    if (times.length >= 2) {
      const older = times.slice(1);
      const olderMean = older.reduce((a, b) => a + b, 0) / older.length;
      if (times[0] > olderMean * cfg.maxSlowdown) return { level, change: 'hold', reason: 'slower' };
    }
    return { level: level + 1, change: 'up', reason: 'mastered' };
  }
  if (acc < cfg.downAccuracy) return down('struggling');
  return { level, change: 'hold', reason: 'steady' };
}
