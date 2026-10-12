/**
 * One attempt inside a game session.
 * Games are errorless: a wrong answer is gently corrected and the patient
 * continues, so "correct" means *correct on the first try*.
 */
export type Trial = {
  correct: boolean;
  /** Time from the prompt appearing to the first answer, if measured. */
  reactionMs: number | null;
};

export type SessionStats = {
  trials: number;
  correct: number;
  /** 0..1 share of first-try correct answers. */
  accuracy: number;
  avgReactionMs: number | null;
  /** 0..100 session score: mostly accuracy, partly speed. */
  score: number;
};

const ACCURACY_WEIGHT = 0.8;
const SPEED_WEIGHT = 0.2;

/**
 * @param targetReactionMs comfortable answer time for this game; answering at
 *   or under it earns the full speed component, slower answers earn less.
 */
export function computeSessionStats(trials: readonly Trial[], targetReactionMs: number): SessionStats {
  const n = trials.length;
  if (n === 0) return { trials: 0, correct: 0, accuracy: 0, avgReactionMs: null, score: 0 };

  const correct = trials.filter((t) => t.correct).length;
  const accuracy = correct / n;

  const times = trials.map((t) => t.reactionMs).filter((ms): ms is number => ms != null && ms >= 0);
  const avgReactionMs = times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;

  // No timing data → neutral speed so the score reflects accuracy only.
  const speed = avgReactionMs == null ? accuracy : Math.min(1, targetReactionMs / Math.max(avgReactionMs, 1));
  const score = Math.round(100 * (ACCURACY_WEIGHT * accuracy + SPEED_WEIGHT * speed));

  return { trials: n, correct, accuracy, avgReactionMs, score };
}
