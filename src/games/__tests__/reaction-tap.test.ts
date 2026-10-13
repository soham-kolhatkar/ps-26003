import { seededRng } from '@/engine/random';
import en from '@/i18n/packs/en.json';
import hi from '@/i18n/packs/hi.json';

import {
  DELAY_MAX_MS,
  DELAY_MIN_MS,
  DISTRACTORS,
  gridShape,
  levelParams,
  makeTrials,
  MAX_LEVEL,
  noGoIndexes,
  TARGET,
} from '../reaction-tap/rounds';

describe('reaction tap trials', () => {
  it('gets harder with level: more places, less time, then "don\'t tap" trials', () => {
    expect(levelParams(1)).toEqual({ cells: 1, windowMs: 5000, noGoRate: 0 });
    expect(levelParams(2).noGoRate).toBe(0);
    for (let l = 2; l <= MAX_LEVEL; l++) {
      expect(levelParams(l).windowMs).toBeLessThan(levelParams(l - 1).windowMs);
      expect(levelParams(l).cells).toBeGreaterThanOrEqual(levelParams(l - 1).cells);
    }
    expect(levelParams(99)).toEqual(levelParams(MAX_LEVEL));
  });

  it('places "don\'t tap" trials after the warm-up and never back-to-back', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const idx = [...noGoIndexes(10, 0.3, seededRng(seed))].sort((a, b) => a - b);
      expect(idx).toHaveLength(3);
      expect(idx[0]).toBeGreaterThanOrEqual(2);
      idx.slice(1).forEach((v, i) => expect(v - idx[i]).toBeGreaterThan(1));
    }
    expect(noGoIndexes(10, 0, seededRng(1)).size).toBe(0);
  });

  it('builds plans with valid cells, delays and pictures', () => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const { cells, noGoRate } = levelParams(level);
      const plans = makeTrials(level, 10, seededRng(level));
      expect(plans).toHaveLength(10);
      expect(plans.filter((p) => !p.go)).toHaveLength(Math.round(noGoRate * 10));
      plans.forEach((p, i) => {
        expect(p.cell).toBeGreaterThanOrEqual(0);
        expect(p.cell).toBeLessThan(cells);
        if (cells > 1 && i > 0) expect(p.cell).not.toBe(plans[i - 1].cell);
        expect(p.delayMs).toBeGreaterThanOrEqual(DELAY_MIN_MS);
        expect(p.delayMs).toBeLessThanOrEqual(DELAY_MAX_MS);
        expect(p.go ? p.shown : DISTRACTORS).toEqual(p.go ? TARGET : expect.arrayContaining([p.shown]));
      });
    }
  });

  it('grid shapes hold every cell', () => {
    for (const n of [1, 4, 6, 9]) {
      const { rows, cols } = gridShape(n);
      expect(rows * cols).toBe(n);
    }
  });

  it('every picture has a name in every language', () => {
    for (const pack of [en, hi]) {
      for (const it of [TARGET, ...DISTRACTORS]) expect((pack.items as Record<string, string>)[it.id]).toBeTruthy();
    }
  });
});
