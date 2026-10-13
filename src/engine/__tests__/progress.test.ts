import {
  activitySummary,
  adherenceByType,
  dailyAdherence,
  dailyScores,
  dayStarts,
  gameSummary,
  trendOf,
  type OccurrencePoint,
  type SessionPoint,
} from '../progress';

const at = (d: number, h = 10, m = 0) => new Date(2026, 9, d, h, m).getTime();
const now = at(13, 18); // Tue 13 Oct 2026, 18:00 local

const s = (d: number, gameId: string, score: number, completed = true, minutes = 2): SessionPoint => ({
  gameId,
  startedAt: at(d),
  endedAt: at(d) + minutes * 60000,
  level: 2,
  score,
  completed,
});

describe('dayStarts', () => {
  it('lists local midnights, oldest first, ending today', () => {
    const days = dayStarts(3, now);
    expect(days).toEqual([
      new Date(2026, 9, 11).getTime(),
      new Date(2026, 9, 12).getTime(),
      new Date(2026, 9, 13).getTime(),
    ]);
  });
});

describe('dailyScores', () => {
  it('averages completed sessions per day and leaves gaps as null', () => {
    const rows = [s(13, 'memory', 80), s(13, 'memory', 60), s(11, 'routine', 90), s(12, 'memory', 10, false)];
    expect(dailyScores(rows, 3, now).map((d) => [d.sessions, d.avgScore])).toEqual([
      [1, 90],
      [0, null],
      [2, 70],
    ]);
    expect(dailyScores(rows, 3, now, 'routine').map((d) => d.avgScore)).toEqual([90, null, null]);
  });
});

describe('gameSummary', () => {
  it('compares the current window with the one before it', () => {
    const rows = [
      s(1, 'memory', 60),
      s(2, 'memory', 60),
      s(3, 'memory', 70),
      s(8, 'memory', 80),
      s(10, 'memory', 85),
      s(12, 'memory', 90),
    ];
    const g = gameSummary(rows, 'memory', 7, now); // window 7..13, previous 30 Sep..6 Oct
    expect(g.sessions).toBe(3);
    expect(g.avgScore).toBe(85);
    expect(g.prevAvgScore).toBeCloseTo(63.33, 1);
    expect(g.delta).toBeCloseTo(21.67, 1);
    expect(g.trend).toBe('up');
    expect(g.lastPlayed).toBe(at(12));
    expect(g.series).toHaveLength(7);
    expect(g.recent).toEqual([60, 60, 70, 80, 85, 90]);
  });

  it('keeps only the last 12 sessions for the sparkline', () => {
    const many = Array.from({ length: 20 }, (_, i) => s(1 + (i % 12), 'memory', i));
    expect(gameSummary(many, 'memory', 7, now).recent).toHaveLength(12);
  });

  it('has no trend without enough sessions on both sides', () => {
    const g = gameSummary([s(12, 'memory', 90)], 'memory', 7, now);
    expect(g.delta).toBeNull();
    expect(g.trend).toBeNull();
    // 3 now vs 1 before: a single earlier session is not a baseline.
    const thin = [s(2, 'memory', 40), s(8, 'memory', 90), s(10, 'memory', 90), s(12, 'memory', 90)];
    expect(gameSummary(thin, 'memory', 7, now).delta).toBeNull();
  });

  it('treats small moves as steady', () => {
    expect(trendOf(2.9)).toBe('steady');
    expect(trendOf(-3)).toBe('down');
  });
});

describe('activitySummary', () => {
  it('counts completed sessions, active days and minutes (incl. stopped sessions)', () => {
    const rows = [s(13, 'memory', 80), s(13, 'routine', 70, true, 3), s(10, 'memory', 0, false, 1), s(1, 'memory', 50)];
    expect(activitySummary(rows, 7, now)).toEqual({
      sessions: 2,
      scores: [80, 70],
      activeDays: 2,
      days: 7,
      minutes: 6,
      avgScore: 75,
    });
  });
});

describe('adherence', () => {
  const o = (d: number, h: number, status: OccurrencePoint['status'], type: OccurrencePoint['type'] = 'medicine') => ({
    dueAt: at(d, h),
    status,
    type,
  });

  it('per day: decided only, pending older than 2h = missed', () => {
    const occ = [
      o(12, 8, 'taken'),
      o(12, 20, 'pending'),
      o(13, 8, 'taken'),
      o(13, 17, 'pending'),
      o(13, 20, 'pending'),
    ];
    const days = dailyAdherence(occ, 2, now);
    expect(days.map((d) => [d.taken, d.missed, d.decided, d.rate])).toEqual([
      [1, 1, 2, 0.5],
      [1, 0, 1, 1],
    ]);
  });

  it('by type, skipping types with nothing decided', () => {
    const occ = [
      o(12, 8, 'taken'),
      o(12, 9, 'pending', 'hydration'),
      o(12, 10, 'taken', 'hydration'),
      o(20, 10, 'pending', 'appointment'),
    ];
    expect(adherenceByType(occ, now)).toEqual([
      { type: 'medicine', taken: 1, decided: 1, rate: 1 },
      { type: 'hydration', taken: 1, decided: 2, rate: 0.5 },
    ]);
  });
});
