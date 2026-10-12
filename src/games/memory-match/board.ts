import { defaultRng, sample, shuffle, type Rng } from '@/engine/random';

import { ITEMS, type Item } from '../items';

export const MAX_LEVEL = 5;

export type LevelParams = {
  pairs: number;
  /** All cards are shown face-up for this long before play starts. */
  previewMs: number;
  /** Grid columns for a portrait phone. */
  columns: number;
};

const LEVELS: Record<number, LevelParams> = {
  1: { pairs: 2, previewMs: 4000, columns: 2 },
  2: { pairs: 3, previewMs: 4000, columns: 3 },
  3: { pairs: 4, previewMs: 3500, columns: 4 },
  4: { pairs: 6, previewMs: 3000, columns: 4 },
  5: { pairs: 8, previewMs: 3000, columns: 4 },
};

export function levelParams(level: number): LevelParams {
  return LEVELS[Math.min(MAX_LEVEL, Math.max(1, Math.round(level)))];
}

export type Card = { index: number; item: Item };

/** A shuffled deck with exactly two cards per chosen item. */
export function makeDeck(level: number, rng: Rng = defaultRng, pool: readonly Item[] = ITEMS): Card[] {
  const items = sample(pool, levelParams(level).pairs, rng);
  return shuffle([...items, ...items], rng).map((item, index) => ({ index, item }));
}

export function partnerOf(deck: readonly Card[], index: number): number {
  const id = deck[index].item.id;
  const partner = deck.findIndex((c) => c.item.id === id && c.index !== index);
  if (partner < 0) throw new Error(`card ${index} has no partner`);
  return partner;
}

export type AttemptResult =
  | { kind: 'match' }
  /** Wrong pair although the first card's partner had already been seen: a memory error. */
  | { kind: 'memory_error' }
  /** Wrong pair while still discovering the board: not counted against the patient. */
  | { kind: 'exploring' };

/**
 * Classifies a two-card attempt. `seenBefore` = card indices revealed during
 * play *before* this attempt (the preview does not count).
 */
export function classifyAttempt(
  deck: readonly Card[],
  seenBefore: ReadonlySet<number>,
  first: number,
  second: number,
): AttemptResult {
  if (deck[first].item.id === deck[second].item.id) return { kind: 'match' };
  return seenBefore.has(partnerOf(deck, first)) ? { kind: 'memory_error' } : { kind: 'exploring' };
}
