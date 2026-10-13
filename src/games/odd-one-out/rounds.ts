import { defaultRng, pick, sample, shuffle, type Rng } from '@/engine/random';

import { CATEGORIES, CATEGORY_FAMILY, ITEMS, itemsIn, type Category, type Item } from '../items';

export const MAX_LEVEL = 5;

export type LevelParams = {
  /** Pictures on screen (all but one share a category). */
  options: number;
  /** The odd one comes from a related category (fruit vs vegetable): harder. */
  near: boolean;
};

/**
 * Level 1: 3 pictures, very different groups (fruits + an animal) …
 * Level 4–5: related groups (animals + a bird, fruits + a vegetable).
 */
export function levelParams(level: number): LevelParams {
  const l = Math.min(MAX_LEVEL, Math.max(1, level));
  return [
    { options: 3, near: false },
    { options: 4, near: false },
    { options: 5, near: false },
    { options: 4, near: true },
    { options: 5, near: true },
  ][l - 1];
}

export type Round = {
  /** Category most pictures share. */
  group: Category;
  odd: Item;
  options: Item[];
};

function oddCategoryFor(group: Category, near: boolean, rng: Rng): Category {
  const family = CATEGORY_FAMILY[group];
  const candidates = CATEGORIES.filter((c) => c !== group && (CATEGORY_FAMILY[c] === family) === near);
  return pick(candidates, rng);
}

/** Builds `count` rounds; the main group never repeats back-to-back. */
export function makeRounds(
  level: number,
  count: number,
  rng: Rng = defaultRng,
  pool: readonly Item[] = ITEMS,
): Round[] {
  const { options, near } = levelParams(level);
  const usable = CATEGORIES.filter((c) => itemsIn(c, pool).length >= options - 1);
  const rounds: Round[] = [];
  let previous: Category | null = null;
  for (let i = 0; i < count; i++) {
    const group = pick(
      usable.filter((c) => c !== previous),
      rng,
    );
    const odd = pick(itemsIn(oddCategoryFor(group, near, rng), pool), rng);
    const same = sample(itemsIn(group, pool), options - 1, rng);
    rounds.push({ group, odd, options: shuffle([...same, odd], rng) });
    previous = group;
  }
  return rounds;
}
