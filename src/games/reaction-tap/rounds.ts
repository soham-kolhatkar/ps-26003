import { defaultRng, pick, randomInt, shuffle, type Rng } from '@/engine/random';

export const MAX_LEVEL = 5;

/** The thing to catch, and look-alikes that must be left alone (no-go). */
export const TARGET = { id: 'fish', emoji: '🐟' } as const;
export const DISTRACTORS = [
  { id: 'frog', emoji: '🐸' },
  { id: 'duck', emoji: '🦆' },
  { id: 'leaf', emoji: '🍃' },
] as const;

export type Shown = { id: string; emoji: string };

export type LevelParams = {
  /** Places in the pond where something can appear (1, 4, 6 or 9). */
  cells: number;
  /** How long it stays up before it swims away. */
  windowMs: number;
  /** Share of trials showing a distractor that must NOT be tapped. */
  noGoRate: number;
};

/** Level 1: one big spot, 5 s to tap, fish only … Level 5: 9 spots, 2.5 s, 30% "don't tap". */
export function levelParams(level: number): LevelParams {
  const l = Math.min(MAX_LEVEL, Math.max(1, level));
  return [
    { cells: 1, windowMs: 5000, noGoRate: 0 },
    { cells: 4, windowMs: 4000, noGoRate: 0 },
    { cells: 4, windowMs: 3500, noGoRate: 0.2 },
    { cells: 6, windowMs: 3000, noGoRate: 0.25 },
    { cells: 9, windowMs: 2500, noGoRate: 0.3 },
  ][l - 1];
}

/** Random wait before each appearance, so taps can't be timed in advance. */
export const DELAY_MIN_MS = 1000;
export const DELAY_MAX_MS = 2500;
/** The first trials are always fish, so the patient learns the game first. */
const WARM_UP = 2;

export type TrialPlan = {
  go: boolean;
  shown: Shown;
  cell: number;
  delayMs: number;
};

/** Which trials are "don't tap": never in the warm-up, never two in a row. */
export function noGoIndexes(count: number, rate: number, rng: Rng = defaultRng): Set<number> {
  const wanted = Math.round(rate * count);
  const picked = new Set<number>();
  const candidates = shuffle(
    Array.from({ length: Math.max(0, count - WARM_UP) }, (_, i) => i + WARM_UP),
    rng,
  );
  for (const i of candidates) {
    if (picked.size >= wanted) break;
    if (!picked.has(i - 1) && !picked.has(i + 1)) picked.add(i);
  }
  return picked;
}

export function makeTrials(level: number, count: number, rng: Rng = defaultRng): TrialPlan[] {
  const { cells, noGoRate } = levelParams(level);
  const noGo = noGoIndexes(count, noGoRate, rng);
  const plans: TrialPlan[] = [];
  let previousCell = -1;
  for (let i = 0; i < count; i++) {
    let cell = randomInt(cells, rng);
    // A new place each time (when there is more than one).
    if (cells > 1 && cell === previousCell) cell = (cell + 1 + randomInt(cells - 1, rng)) % cells;
    const go = !noGo.has(i);
    plans.push({
      go,
      shown: go ? TARGET : pick(DISTRACTORS, rng),
      cell,
      delayMs: DELAY_MIN_MS + randomInt(DELAY_MAX_MS - DELAY_MIN_MS + 1, rng),
    });
    previousCell = cell;
  }
  return plans;
}

/** Rows × columns for the pond grid. */
export function gridShape(cells: number): { rows: number; cols: number } {
  if (cells <= 1) return { rows: 1, cols: 1 };
  if (cells === 4) return { rows: 2, cols: 2 };
  if (cells === 6) return { rows: 3, cols: 2 };
  return { rows: 3, cols: 3 };
}
