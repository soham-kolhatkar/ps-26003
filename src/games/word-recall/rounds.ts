import { defaultRng, randomInt, sample, shuffle, type Rng } from '@/engine/random';

import { distinctLooking, ITEMS, type Item } from '../items';

export const MAX_LEVEL = 5;

export type LevelParams = {
  /** Pictures to remember. */
  words: number;
  /** Extra pictures shown at recall that were not in the list. */
  foils: number;
  /** Stars to tap during the break (a longer break = a longer delay). */
  stars: number;
  /** Foils from the same groups as the list (a mango when a banana was shown): harder. */
  nearFoils: boolean;
};

/** Level 1: remember 2, pick them from 4 … Level 5: remember 5, pick from 11 with look-alike groups. */
export function levelParams(level: number): LevelParams {
  const l = Math.min(MAX_LEVEL, Math.max(1, level));
  return [
    { words: 2, foils: 2, stars: 2, nearFoils: false },
    { words: 3, foils: 3, stars: 3, nearFoils: false },
    { words: 3, foils: 5, stars: 4, nearFoils: false },
    { words: 4, foils: 5, stars: 5, nearFoils: false },
    { words: 5, foils: 6, stars: 6, nearFoils: true },
  ][l - 1];
}

/** Lists per session. */
export const ROUNDS_PER_SESSION = 2;
/** Places the break stars can appear in (3 × 3). */
export const STAR_CELLS = 9;

export type Round = {
  /** In the order they are shown. */
  words: Item[];
  /** Words + foils, shuffled: the recall grid. */
  grid: Item[];
  /** Grid cells (0..8) holding a star during the break. */
  stars: number[];
};

export function makeRound(level: number, rng: Rng = defaultRng, pool: readonly Item[] = ITEMS): Round {
  const { words: n, foils: f, stars, nearFoils } = levelParams(level);
  let words: Item[];
  let foils: Item[];
  if (!nearFoils) {
    // Every picture on the grid from a different group: easy to tell apart.
    const picks = distinctLooking(pool, n + f, rng);
    words = picks.slice(0, n);
    foils = picks.slice(n);
  } else {
    words = distinctLooking(pool, n, rng);
    const used = new Set(words.map((w) => w.id));
    foils = [];
    for (const w of words) {
      const sibling = sample(
        pool.filter((it) => w.category && it.category === w.category && !used.has(it.id)),
        1,
        rng,
      )[0];
      if (sibling) {
        foils.push(sibling);
        used.add(sibling.id);
      }
    }
    foils.push(
      ...sample(
        pool.filter((it) => !used.has(it.id)),
        f - foils.length,
        rng,
      ),
    );
  }
  return {
    words,
    grid: shuffle([...words, ...foils], rng),
    stars: shuffle(
      Array.from({ length: STAR_CELLS }, (_, i) => i),
      rng,
    ).slice(0, stars),
  };
}

export function makeRounds(level: number, count = ROUNDS_PER_SESSION, rng: Rng = defaultRng): Round[] {
  const rounds: Round[] = [];
  for (let i = 0; i < count; i++) {
    // A new list each time: no picture from the previous list.
    const previous = new Set(rounds.at(-1)?.words.map((w) => w.id) ?? []);
    rounds.push(
      makeRound(
        level,
        rng,
        ITEMS.filter((it) => !previous.has(it.id)),
      ),
    );
  }
  return rounds;
}

/** Wrong taps in a round before the app shows one of the remaining pictures. */
export const HINT_AFTER_WRONG = 2;

/** Random pick of a not-yet-found word to reveal as a hint. */
export function hintWord(round: Round, found: ReadonlySet<string>, rng: Rng = defaultRng): Item | null {
  const left = round.words.filter((w) => !found.has(w.id));
  return left.length ? left[randomInt(left.length, rng)] : null;
}
