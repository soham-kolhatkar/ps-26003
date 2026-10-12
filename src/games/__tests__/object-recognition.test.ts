import { seededRng } from '@/engine/random';

import { ITEMS } from '../object-recognition/content';
import { levelParams, makeRounds, MAX_LEVEL } from '../object-recognition/rounds';
import en from '@/i18n/packs/en.json';
import hi from '@/i18n/packs/hi.json';

describe('object recognition rounds', () => {
  it('scales options with level and drops the picture cue from level 3', () => {
    expect(levelParams(1)).toEqual({ options: 2, showTargetPicture: true });
    expect(levelParams(2)).toEqual({ options: 3, showTargetPicture: true });
    expect(levelParams(3)).toEqual({ options: 4, showTargetPicture: false });
    expect(levelParams(MAX_LEVEL)).toEqual({ options: 6, showTargetPicture: false });
    expect(levelParams(99).options).toBe(6);
    expect(levelParams(0).options).toBe(2);
  });

  it('builds rounds with distinct options containing the target', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const rounds = makeRounds(level, 20, seededRng(level));
      expect(rounds).toHaveLength(20);
      for (const r of rounds) {
        expect(r.options).toHaveLength(level + 1);
        expect(new Set(r.options.map((o) => o.id)).size).toBe(r.options.length);
        expect(r.options.map((o) => o.id)).toContain(r.target.id);
      }
    }
  });

  it('never repeats a target back-to-back', () => {
    const rounds = makeRounds(1, 50, seededRng(3));
    rounds.slice(1).forEach((r, i) => expect(r.target.id).not.toBe(rounds[i].target.id));
  });

  it('every item has a name in every language', () => {
    for (const item of ITEMS) {
      expect((en.items as Record<string, string>)[item.id]).toBeTruthy();
      expect((hi.items as Record<string, string>)[item.id]).toBeTruthy();
    }
  });
});
