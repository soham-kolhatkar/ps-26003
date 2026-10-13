import { defaultRng, pick, randomInt, shuffle, type Rng } from '@/engine/random';

import { ITEMS, type Item } from '../items';

export const MAX_LEVEL = 5;

export type LevelParams = {
  /** Repeating units to choose from, written as letters ("AAB" = two of A, then B). */
  templates: readonly string[];
  /** Answer choices. */
  options: number;
  /** The gap may be inside the row (not only at the end). */
  gapAnywhere: boolean;
};

/** Level 1: A B A B A ? with 2 choices … Level 5: A A B B patterns, the gap anywhere, 4 choices. */
export function levelParams(level: number): LevelParams {
  const l = Math.min(MAX_LEVEL, Math.max(1, level));
  return [
    { templates: ['AB'], options: 2, gapAnywhere: false },
    { templates: ['AB'], options: 3, gapAnywhere: false },
    { templates: ['ABC', 'AAB', 'ABB'], options: 3, gapAnywhere: false },
    { templates: ['ABC', 'AAB', 'ABB'], options: 4, gapAnywhere: false },
    { templates: ['AABB', 'ABAC', 'ABC'], options: 4, gapAnywhere: true },
  ][l - 1];
}

/** Shortest row that still shows the unit at least twice. */
const MIN_ROW = 6;

export type Round = {
  /** The full row; `row[gap]` is hidden and is the answer. */
  row: Item[];
  /** Length of the repeating unit (the screen shows one unit per line). */
  unit: number;
  gap: number;
  answer: Item;
  options: Item[];
};

/**
 * `count` items from different categories, so no two pictures on screen look
 * alike (orange/lemon, bus/truck). Uncategorised items each count as their own.
 */
export function distinctLooking(pool: readonly Item[], count: number, rng: Rng = defaultRng): Item[] {
  const seen = new Set<string>();
  const out: Item[] = [];
  for (const it of shuffle(pool, rng)) {
    const key = it.category ?? it.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
    if (out.length === count) break;
  }
  return out;
}

export function makeRound(level: number, rng: Rng = defaultRng, pool: readonly Item[] = ITEMS): Round {
  const { templates, options, gapAnywhere } = levelParams(level);
  const unit = pick(templates, rng);
  const letters = [...new Set(unit)];
  const picks = distinctLooking(pool, letters.length + options, rng);
  const chosen = picks.slice(0, letters.length);
  const byLetter = new Map(letters.map((l, i) => [l, chosen[i]]));
  const length = Math.max(MIN_ROW, unit.length * 2);
  const row = Array.from({ length }, (_, i) => byLetter.get(unit[i % unit.length])!);
  // The gap is never inside the first full unit, so the rule is always visible before it.
  const gap = gapAnywhere ? unit.length + randomInt(length - unit.length, rng) : length - 1;
  const answer = row[gap];
  const others = chosen.filter((it) => it.id !== answer.id);
  const outsiders = picks.slice(letters.length, letters.length + Math.max(0, options - 1 - others.length));
  const distractors = [...others, ...outsiders].slice(0, options - 1);
  return { row, unit: unit.length, gap, answer, options: shuffle([answer, ...distractors], rng) };
}

export function makeRounds(level: number, count: number, rng: Rng = defaultRng, pool: readonly Item[] = ITEMS) {
  return Array.from({ length: count }, () => makeRound(level, rng, pool));
}
