import { seededRng } from '@/engine/random';

import { classifyAttempt, levelParams, makeDeck, MAX_LEVEL, partnerOf, type Card } from '../memory-match/board';

const item = (id: string) => ({ id, emoji: id });
// Fixed deck: positions 0..3 = A B A B
const deck: Card[] = ['A', 'B', 'A', 'B'].map((id, index) => ({ index, item: item(id) }));

describe('memory match board', () => {
  it('grows from 2 to 8 pairs', () => {
    expect([1, 2, 3, 4, 5].map((l) => levelParams(l).pairs)).toEqual([2, 3, 4, 6, 8]);
    expect(levelParams(0).pairs).toBe(2);
    expect(levelParams(99).pairs).toBe(8);
  });

  it('every level fills its grid without a ragged last row', () => {
    for (let l = 1; l <= MAX_LEVEL; l++) {
      const { pairs, columns } = levelParams(l);
      expect((pairs * 2) % columns).toBe(0);
    }
  });

  it('deals exactly two of each item', () => {
    for (let l = 1; l <= MAX_LEVEL; l++) {
      const cards = makeDeck(l, seededRng(l));
      expect(cards).toHaveLength(levelParams(l).pairs * 2);
      const counts = new Map<string, number>();
      cards.forEach((c) => counts.set(c.item.id, (counts.get(c.item.id) ?? 0) + 1));
      expect([...counts.values()].every((n) => n === 2)).toBe(true);
      cards.forEach((c, i) => expect(c.index).toBe(i));
    }
  });

  it('finds partners', () => {
    expect(partnerOf(deck, 0)).toBe(2);
    expect(partnerOf(deck, 3)).toBe(1);
  });

  it('classifies a match', () => {
    expect(classifyAttempt(deck, new Set(), 0, 2)).toEqual({ kind: 'match' });
  });

  it('does not blame a miss while the partner is still unseen', () => {
    expect(classifyAttempt(deck, new Set(), 0, 1)).toEqual({ kind: 'exploring' });
    expect(classifyAttempt(deck, new Set([3]), 0, 1)).toEqual({ kind: 'exploring' });
  });

  it('counts a memory error when the partner was already seen', () => {
    expect(classifyAttempt(deck, new Set([2]), 0, 1)).toEqual({ kind: 'memory_error' });
  });
});
