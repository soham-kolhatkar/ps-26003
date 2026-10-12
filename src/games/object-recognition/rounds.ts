import { defaultRng, sample, shuffle, type Rng } from '@/engine/random';

import { ITEMS, type Item } from '../items';

export const MAX_LEVEL = 5;

export type LevelParams = {
  /** Pictures on screen. */
  options: number;
  /** Show the target picture next to its name (matching) vs name only (recall). */
  showTargetPicture: boolean;
};

/** Level 1: 2 options + picture cue … Level 5: 6 options, name only. */
export function levelParams(level: number): LevelParams {
  const l = Math.min(MAX_LEVEL, Math.max(1, level));
  return { options: l + 1, showTargetPicture: l <= 2 };
}

export type Round = { target: Item; options: Item[] };

/** Builds `count` rounds; a target never repeats back-to-back. */
export function makeRounds(
  level: number,
  count: number,
  rng: Rng = defaultRng,
  pool: readonly Item[] = ITEMS,
): Round[] {
  const { options } = levelParams(level);
  const rounds: Round[] = [];
  let previous: string | null = null;
  for (let i = 0; i < count; i++) {
    const choices = sample(
      pool.filter((it) => it.id !== previous),
      options,
      rng,
    );
    const target = choices[0];
    rounds.push({ target, options: shuffle(choices, rng) });
    previous = target.id;
  }
  return rounds;
}
