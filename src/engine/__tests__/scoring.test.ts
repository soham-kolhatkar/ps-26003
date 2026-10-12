import { computeSessionStats } from '../scoring';

describe('computeSessionStats', () => {
  it('handles an empty session', () => {
    expect(computeSessionStats([], 3000)).toEqual({
      trials: 0,
      correct: 0,
      accuracy: 0,
      avgReactionMs: null,
      score: 0,
    });
  });

  it('gives 100 for all correct within the target time', () => {
    const stats = computeSessionStats(
      [
        { correct: true, reactionMs: 1000 },
        { correct: true, reactionMs: 2000 },
      ],
      3000,
    );
    expect(stats).toEqual({ trials: 2, correct: 2, accuracy: 1, avgReactionMs: 1500, score: 100 });
  });

  it('reduces the speed part for slow answers', () => {
    // accuracy 0.5 → 40; speed 3000/6000 = 0.5 → 10
    const stats = computeSessionStats(
      [
        { correct: true, reactionMs: 6000 },
        { correct: false, reactionMs: 6000 },
      ],
      3000,
    );
    expect(stats.score).toBe(50);
  });

  it('scores on accuracy only when there is no timing', () => {
    const stats = computeSessionStats(
      [
        { correct: true, reactionMs: null },
        { correct: false, reactionMs: null },
      ],
      3000,
    );
    expect(stats.avgReactionMs).toBeNull();
    expect(stats.score).toBe(50);
  });
});
