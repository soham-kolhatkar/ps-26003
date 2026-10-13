import { seededRng } from '@/engine/random';

import { hintWord, levelParams, makeRound, makeRounds, MAX_LEVEL, STAR_CELLS } from '../word-recall/rounds';

describe('word recall rounds', () => {
  it('remembers more, among more foils, with a longer break as the level rises', () => {
    expect(levelParams(1)).toEqual({ words: 2, foils: 2, stars: 2, nearFoils: false });
    for (let l = 2; l <= MAX_LEVEL; l++) {
      expect(levelParams(l).words).toBeGreaterThanOrEqual(levelParams(l - 1).words);
      expect(levelParams(l).words + levelParams(l).foils).toBeGreaterThan(
        levelParams(l - 1).words + levelParams(l - 1).foils,
      );
      expect(levelParams(l).stars).toBeGreaterThan(levelParams(l - 1).stars);
    }
    expect(levelParams(MAX_LEVEL).nearFoils).toBe(true);
    expect(levelParams(0)).toEqual(levelParams(1));
  });

  it('builds a grid of the words plus distinct foils', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const { words, foils, stars } = levelParams(level);
      for (let seed = 1; seed <= 25; seed++) {
        const r = makeRound(level, seededRng(seed * level));
        expect(r.words).toHaveLength(words);
        expect(r.grid).toHaveLength(words + foils);
        expect(new Set(r.grid.map((g) => g.id)).size).toBe(words + foils);
        r.words.forEach((w) => expect(r.grid).toContain(w));
        expect(r.stars).toHaveLength(stars);
        expect(new Set(r.stars).size).toBe(stars);
        r.stars.forEach((s) => expect(s).toBeLessThan(STAR_CELLS));
        // The list itself never has two look-alikes.
        const cats = r.words.map((w) => w.category).filter(Boolean);
        expect(new Set(cats).size).toBe(cats.length);
      }
    }
  });

  it('uses look-alike foils only at the top level', () => {
    const sameGroup = (level: number) => {
      const r = makeRound(level, seededRng(4));
      const wordIds = new Set(r.words.map((w) => w.id));
      const wordCats = new Set(r.words.map((w) => w.category).filter(Boolean));
      return r.grid.filter((g) => !wordIds.has(g.id) && g.category && wordCats.has(g.category)).length;
    };
    expect(sameGroup(2)).toBe(0);
    expect(sameGroup(MAX_LEVEL)).toBeGreaterThanOrEqual(3);
  });

  it('never reuses a picture from the previous list', () => {
    const [a, b] = makeRounds(3, 2, seededRng(8));
    const first = new Set(a.words.map((w) => w.id));
    b.words.forEach((w) => expect(first.has(w.id)).toBe(false));
  });

  it('hints a word that is still missing', () => {
    const r = makeRound(3, seededRng(2));
    const found = new Set([r.words[0].id, r.words[1].id]);
    expect(hintWord(r, found, seededRng(1))).toBe(r.words[2]);
    expect(hintWord(r, new Set(r.words.map((w) => w.id)))).toBeNull();
  });
});
