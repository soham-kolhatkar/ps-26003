import { nextLevel, weightedAccuracy, type SessionOutcome } from '../difficulty';

const s = (level: number, accuracy: number, avgReactionMs: number | null = 2000): SessionOutcome => ({
  level,
  accuracy,
  avgReactionMs,
});

describe('nextLevel', () => {
  it('holds during warm-up with no or one session at the level', () => {
    expect(nextLevel(1, [])).toMatchObject({ level: 1, change: 'hold', reason: 'warmup' });
    expect(nextLevel(2, [s(2, 1)])).toMatchObject({ level: 2, change: 'hold', reason: 'warmup' });
  });

  it('ignores sessions played at other levels', () => {
    expect(nextLevel(3, [s(3, 1), s(2, 1), s(2, 1)])).toMatchObject({ level: 3, reason: 'warmup' });
  });

  it('steps up after two strong sessions', () => {
    expect(nextLevel(2, [s(2, 0.9), s(2, 0.85)])).toEqual({ level: 3, change: 'up', reason: 'mastered' });
  });

  it('does not step up if the patient is getting clearly slower', () => {
    expect(nextLevel(2, [s(2, 1, 3000), s(2, 1, 2000)])).toMatchObject({ change: 'hold', reason: 'slower' });
    expect(nextLevel(2, [s(2, 1, 2200), s(2, 1, 2000)])).toMatchObject({ change: 'up' });
  });

  it('rescues immediately after a rough session', () => {
    expect(nextLevel(3, [s(3, 0.4)])).toEqual({ level: 2, change: 'down', reason: 'rescue' });
  });

  it('steps down when weighted accuracy is below 65%', () => {
    expect(nextLevel(3, [s(3, 0.6), s(3, 0.6)])).toEqual({ level: 2, change: 'down', reason: 'struggling' });
  });

  it('holds in the comfortable 65–85% band', () => {
    expect(nextLevel(3, [s(3, 0.8), s(3, 0.75)])).toEqual({ level: 3, change: 'hold', reason: 'steady' });
  });

  it('weights recent sessions more', () => {
    // newest 1.0, older 0.6, 0.6 → (3*1 + 2*.6 + 1*.6)/6 = 0.8
    expect(weightedAccuracy([s(1, 1), s(1, 0.6), s(1, 0.6)])).toBeCloseTo(0.8);
    expect(nextLevel(2, [s(2, 1), s(2, 0.6), s(2, 0.6)]).change).toBe('hold');
  });

  it('only looks at the last 3 sessions at the level', () => {
    expect(nextLevel(2, [s(2, 0.9), s(2, 0.9), s(2, 0.9), s(2, 0.1), s(2, 0.1)]).change).toBe('up');
  });

  it('clamps at min and max levels', () => {
    expect(nextLevel(1, [s(1, 0.2)])).toEqual({ level: 1, change: 'hold', reason: 'min' });
    expect(nextLevel(5, [s(5, 1), s(5, 1)])).toEqual({ level: 5, change: 'hold', reason: 'max' });
    expect(nextLevel(4, [s(4, 1), s(4, 1)], { maxLevel: 4 })).toMatchObject({ level: 4, reason: 'max' });
  });
});
