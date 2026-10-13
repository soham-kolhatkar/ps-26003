import {
  adherenceOver,
  compare,
  domainSummaries,
  GAME_DOMAIN,
  gameRows,
  reactionSummary,
  reportWindow,
  weeklyIndex,
  type ReportSession,
} from '../report';

const at = (d: number, h = 10) => new Date(2026, 9, d, h).getTime();
const now = at(30, 18); // Fri 30 Oct 2026; period 1..30 Oct, mid = 16 Oct

const s = (
  d: number,
  gameId: string,
  level: number,
  score: number,
  avgReactionMs: number | null = null,
): ReportSession => ({
  gameId,
  startedAt: at(d),
  endedAt: at(d) + 120000,
  level,
  score,
  completed: true,
  avgReactionMs,
});

describe('report window', () => {
  it('30 days ending today, split into two halves', () => {
    expect(reportWindow(now)).toEqual({ from: new Date(2026, 9, 1).getTime(), mid: new Date(2026, 9, 16).getTime() });
  });
});

describe('compare', () => {
  const { mid } = reportWindow(now);
  it('reports the change of the level-aware index between halves', () => {
    const rows = [s(2, 'memory_match', 3, 80), s(5, 'memory_match', 3, 80), s(9, 'memory_match', 3, 80)];
    const later = [s(20, 'memory_match', 2, 80), s(24, 'memory_match', 2, 80), s(28, 'memory_match', 2, 80)];
    expect(compare([...rows, ...later], mid)).toEqual({
      recent: 36,
      previous: 56,
      delta: -20,
      direction: 'down',
      sessions: 6,
    });
  });
  it('gives no direction with too few sessions, steady for small moves', () => {
    expect(compare([s(2, 'pattern', 2, 80), s(20, 'pattern', 1, 50)], mid).direction).toBeNull();
    const steady = [2, 4, 6, 20, 22, 24].map((d, i) => s(d, 'pattern', 2, i < 3 ? 80 : 70));
    expect(compare(steady, mid)).toMatchObject({ delta: -2, direction: 'steady' });
  });
});

describe('domains and games', () => {
  const rows = [
    s(2, 'memory_match', 2, 70),
    s(20, 'word_recall', 2, 60),
    s(3, 'reaction_tap', 1, 90, 1200),
    s(4, 'reaction_tap', 1, 85, 1300),
    s(21, 'reaction_tap', 2, 80, 1500),
    s(25, 'reaction_tap', 2, 70, 1700),
    { ...s(26, 'pattern', 1, 10), completed: false },
    s(1, 'memory_match', 5, 100, null), // 1 Oct: first day of the period
  ];
  it('groups games into domains, only those played', () => {
    const d = domainSummaries(rows, now);
    expect(d.map((x) => [x.domain, x.games, x.sessions])).toEqual([
      ['memory', ['memory_match', 'word_recall'], 3],
      ['attention', ['reaction_tap'], 4],
    ]);
  });
  it('lists games most-played first with latest level and reaction time', () => {
    const g = gameRows(rows, now);
    expect(g.map((r) => [r.gameId, r.sessions, r.level, r.avgReactionMs])).toEqual([
      ['reaction_tap', 4, 2, 1425],
      ['memory_match', 2, 2, null],
      ['word_recall', 1, 2, null],
    ]);
  });
  it('compares reaction time between halves', () => {
    expect(reactionSummary(rows, now)).toEqual({ recentMs: 1600, previousMs: 1250, sessions: 4 });
  });
  it('maps every game to a domain', () => {
    for (const id of [
      'memory_match',
      'routine_sequence',
      'photo_recall',
      'object_recognition',
      'odd_one_out',
      'pattern',
      'reaction_tap',
      'word_recall',
    ]) {
      expect(GAME_DOMAIN[id]).toBeTruthy();
    }
  });
});

describe('weeklyIndex', () => {
  it('8 weekly points ending today, gaps as null', () => {
    const w = weeklyIndex([s(29, 'pattern', 3, 50), s(30, 'pattern', 3, 50), s(10, 'pattern', 1, 0)], now);
    expect(w).toHaveLength(8);
    expect(w.at(-1)).toMatchObject({ index: 50, sessions: 2 });
    expect(w.filter((p) => p.index == null).length).toBe(6);
    expect(w[0].weekStart).toBe(new Date(2026, 8, 5).getTime()); // 56 days ending 30 Oct
  });
});

describe('adherenceOver', () => {
  it('counts decided doses of one type in the period', () => {
    const occ = [
      { dueAt: at(5, 9), status: 'taken' as const, type: 'medicine' as const },
      { dueAt: at(6, 9), status: 'pending' as const, type: 'medicine' as const },
      { dueAt: at(6, 10), status: 'pending' as const, type: 'hydration' as const },
      { dueAt: at(30, 17), status: 'pending' as const, type: 'medicine' as const }, // still due
    ];
    expect(adherenceOver(occ, 'medicine', now)).toEqual({ taken: 1, decided: 2, rate: 0.5 });
    expect(adherenceOver([], 'medicine', now).rate).toBeNull();
  });
});
