import { defaultRng, randomInt, sample, shuffle, type Rng } from '@/engine/random';

import { ROUTINES, type Routine, type RoutineStep } from './content';

export const MAX_LEVEL = 5;
export const ROUNDS_PER_SESSION = 2;

export type LevelParams = {
  /** Steps to put in order. */
  steps: number;
  /** First step is already placed as a starting cue. */
  anchored: boolean;
};

const LEVELS: Record<number, LevelParams> = {
  1: { steps: 3, anchored: true },
  2: { steps: 3, anchored: false },
  3: { steps: 4, anchored: false },
  4: { steps: 5, anchored: false },
  5: { steps: 6, anchored: false },
};

export function levelParams(level: number): LevelParams {
  return LEVELS[Math.min(MAX_LEVEL, Math.max(1, Math.round(level)))];
}

export type Round = {
  routine: Routine;
  /** The steps to order, in the correct order (a contiguous slice of the routine). */
  steps: RoutineStep[];
  /** Shuffled presentation order (never already solved). */
  options: RoutineStep[];
  anchored: boolean;
};

/**
 * Real choices in a round. The anchor is given and the last step is placed
 * automatically when only one card remains, so neither counts as a trial.
 */
export function decisionsIn(round: Pick<Round, 'steps' | 'anchored'>): number {
  return round.steps.length - (round.anchored ? 1 : 0) - 1;
}

function shuffledNotSolved<T>(items: readonly T[], rng: Rng): T[] {
  for (let i = 0; i < 10; i++) {
    const out = shuffle(items, rng);
    if (out.some((x, j) => x !== items[j])) return out;
  }
  return [...items].reverse();
}

export function makeRounds(
  level: number,
  count: number = ROUNDS_PER_SESSION,
  rng: Rng = defaultRng,
  routines: readonly Routine[] = ROUTINES,
): Round[] {
  const { steps, anchored } = levelParams(level);
  const eligible = routines.filter((r) => r.steps.length >= steps);
  return sample(eligible, count, rng).map((routine) => {
    const start = randomInt(routine.steps.length - steps + 1, rng);
    const slice = routine.steps.slice(start, start + steps);
    const toShuffle = anchored ? slice.slice(1) : slice;
    return { routine, steps: slice, options: shuffledNotSolved(toShuffle, rng), anchored };
  });
}
