import { seededRng } from '@/engine/random';

import { distinctLooking, ITEMS } from '../items';
import { levelParams, makeRounds, MAX_LEVEL } from '../pattern/rounds';

describe('pattern rounds', () => {
  it('starts with A-B and 2 choices, ends with longer units and a gap anywhere', () => {
    expect(levelParams(1)).toEqual({ templates: ['AB'], options: 2, gapAnywhere: false });
    expect(levelParams(MAX_LEVEL).gapAnywhere).toBe(true);
    expect(levelParams(MAX_LEVEL).options).toBe(4);
    expect(levelParams(-1)).toEqual(levelParams(1));
  });

  it('builds a repeating row whose gap is decided by the visible part', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const { options, gapAnywhere } = levelParams(level);
      for (const r of makeRounds(level, 40, seededRng(level * 11))) {
        expect(r.row.length).toBeGreaterThanOrEqual(6);
        expect(r.answer).toBe(r.row[r.gap]);
        if (!gapAnywhere) expect(r.gap).toBe(r.row.length - 1);
        // Some earlier visible picture shows what belongs in the gap.
        const period = smallestPeriod(r.row.map((it) => it.id));
        expect(r.gap).toBeGreaterThanOrEqual(period);
        expect(r.row[r.gap - period].id).toBe(r.answer.id);

        expect(r.options).toHaveLength(options);
        expect(new Set(r.options.map((o) => o.id)).size).toBe(options);
        expect(r.options).toContain(r.answer);
      }
    }
  });

  it('level 1 offers only the two pattern pictures', () => {
    for (const r of makeRounds(1, 20, seededRng(5))) {
      const inRow = new Set(r.row.map((it) => it.id));
      expect(inRow.size).toBe(2);
      r.options.forEach((o) => expect(inRow.has(o.id)).toBe(true));
    }
  });

  it('never puts two look-alike pictures (same category) on screen', () => {
    const picks = distinctLooking(ITEMS, 7, seededRng(1));
    expect(picks).toHaveLength(7);
    const pickedCats = picks.map((it) => it.category).filter(Boolean);
    expect(new Set(pickedCats).size).toBe(pickedCats.length);
    for (const r of makeRounds(4, 40, seededRng(9))) {
      const cats = [...new Set([...r.row, ...r.options])].map((it) => it.category).filter(Boolean);
      expect(new Set(cats).size).toBe(cats.length);
    }
  });
});

function smallestPeriod(ids: string[]): number {
  for (let p = 1; p <= ids.length; p++) if (ids.every((id, i) => i < p || id === ids[i - p])) return p;
  return ids.length;
}
