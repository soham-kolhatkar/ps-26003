import { seededRng } from '@/engine/random';
import en from '@/i18n/packs/en.json';
import hi from '@/i18n/packs/hi.json';

import { CATEGORIES, CATEGORY_FAMILY, ITEMS, itemsIn } from '../items';
import { levelParams, makeRounds, MAX_LEVEL } from '../odd-one-out/rounds';

describe('odd one out rounds', () => {
  it('gets harder with level: more pictures, then related groups', () => {
    expect(levelParams(1)).toEqual({ options: 3, near: false });
    expect(levelParams(3)).toEqual({ options: 5, near: false });
    expect(levelParams(4)).toEqual({ options: 4, near: true });
    expect(levelParams(MAX_LEVEL)).toEqual({ options: 5, near: true });
    expect(levelParams(0)).toEqual(levelParams(1));
    expect(levelParams(99)).toEqual(levelParams(MAX_LEVEL));
  });

  it('has exactly one picture outside the main group, from a far or near group as the level says', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const { options, near } = levelParams(level);
      for (const r of makeRounds(level, 40, seededRng(level))) {
        expect(r.options).toHaveLength(options);
        expect(new Set(r.options.map((o) => o.id)).size).toBe(options);
        expect(r.options.filter((o) => o.category === r.group)).toHaveLength(options - 1);
        expect(r.options).toContain(r.odd);
        expect(r.odd.category).not.toBe(r.group);
        expect(CATEGORY_FAMILY[r.odd.category!] === CATEGORY_FAMILY[r.group]).toBe(near);
      }
    }
  });

  it('never repeats the main group back-to-back', () => {
    const rounds = makeRounds(2, 50, seededRng(7));
    rounds.slice(1).forEach((r, i) => expect(r.group).not.toBe(rounds[i].group));
  });

  it('every category has enough pictures and a near partner', () => {
    for (const c of CATEGORIES) {
      expect(itemsIn(c).length).toBeGreaterThanOrEqual(levelParams(MAX_LEVEL).options - 1);
      expect(CATEGORIES.filter((o) => o !== c && CATEGORY_FAMILY[o] === CATEGORY_FAMILY[c])).toHaveLength(1);
    }
  });

  it('every category and item has names in every language', () => {
    for (const pack of [en, hi]) {
      for (const c of CATEGORIES) {
        expect((pack.categories.plural as Record<string, string>)[c]).toBeTruthy();
        expect((pack.categories.one as Record<string, string>)[c]).toBeTruthy();
      }
      for (const item of ITEMS) expect((pack.items as Record<string, string>)[item.id]).toBeTruthy();
    }
  });
});
