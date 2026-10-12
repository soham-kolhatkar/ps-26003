import { seededRng } from '@/engine/random';
import en from '@/i18n/packs/en.json';
import hi from '@/i18n/packs/hi.json';

import { ROUTINES } from '../routine-sequence/content';
import { decisionsIn, levelParams, makeRounds, MAX_LEVEL } from '../routine-sequence/rounds';

type Packs = Record<string, { title: string; steps: Record<string, string> }>;

describe('routine sequencing rounds', () => {
  it('grows from 3 anchored steps to 6 steps', () => {
    expect(levelParams(1)).toEqual({ steps: 3, anchored: true });
    expect(levelParams(2)).toEqual({ steps: 3, anchored: false });
    expect(levelParams(MAX_LEVEL)).toEqual({ steps: 6, anchored: false });
  });

  it('every level has at least two routines long enough', () => {
    for (let l = 1; l <= MAX_LEVEL; l++) {
      expect(ROUTINES.filter((r) => r.steps.length >= levelParams(l).steps).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('builds distinct routines with contiguous, correctly ordered slices', () => {
    for (let l = 1; l <= MAX_LEVEL; l++) {
      const rounds = makeRounds(l, 2, seededRng(l * 7));
      expect(new Set(rounds.map((r) => r.routine.id)).size).toBe(2);
      for (const r of rounds) {
        const { steps, anchored } = levelParams(l);
        expect(r.steps).toHaveLength(steps);
        const ids = r.routine.steps.map((s) => s.id);
        const start = ids.indexOf(r.steps[0].id);
        expect(r.steps.map((s) => s.id)).toEqual(ids.slice(start, start + steps));
        // options = steps minus the anchor, shuffled but never already solved
        const expected = anchored ? r.steps.slice(1) : r.steps;
        expect([...r.options].map((s) => s.id).sort()).toEqual(expected.map((s) => s.id).sort());
        expect(r.options.map((s) => s.id)).not.toEqual(expected.map((s) => s.id));
      }
    }
  });

  it('counts real decisions (no anchor, no forced last card)', () => {
    expect(decisionsIn({ steps: new Array(3), anchored: true })).toBe(1);
    expect(decisionsIn({ steps: new Array(3), anchored: false })).toBe(2);
    expect(decisionsIn({ steps: new Array(6), anchored: false })).toBe(5);
  });

  it('every routine and step has text in every language', () => {
    for (const pack of [en.routines as Packs, hi.routines as Packs]) {
      for (const r of ROUTINES) {
        expect(pack[r.id]?.title).toBeTruthy();
        r.steps.forEach((s) => expect(pack[r.id].steps[s.id]).toBeTruthy());
      }
    }
  });
});
