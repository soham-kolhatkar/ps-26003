import {
  CHECKUP_STEPS,
  checkupScore,
  comparableCheckups,
  isCompleteCheckup,
  checkupTask,
  concerns,
  isConcerning,
  suggestNextVisitDays,
  visitStatus,
  visitUrgency,
} from '../visits';

const at = (d: number, h = 10) => new Date(2026, 9, d, h).getTime();
const DAY = 24 * 3600e3;

describe('observations', () => {
  it('highlights worrying answers only', () => {
    expect(concerns({ sleep: 'poor', mood: 'good', medicines: 'sometimes', falls: 'no' })).toEqual([
      'sleep',
      'medicines',
    ]);
    expect(isConcerning('falls', 'yes')).toBe(true);
    expect(isConcerning('medicines', 'none')).toBe(false);
    expect(isConcerning('mood', undefined)).toBe(false);
  });

  it('suggests a sooner visit when something needs watching', () => {
    expect(suggestNextVisitDays({ seriousAlerts: 0, refer: false, concernCount: 1 })).toBe(14);
    expect(suggestNextVisitDays({ seriousAlerts: 1, refer: false, concernCount: 0 })).toBe(7);
    expect(suggestNextVisitDays({ seriousAlerts: 0, refer: true, concernCount: 0 })).toBe(7);
    expect(suggestNextVisitDays({ seriousAlerts: 0, refer: false, concernCount: 2 })).toBe(7);
  });
});

describe('visitStatus', () => {
  const now = at(20, 18);
  it('counts days to or past the next visit, by calendar day', () => {
    expect(visitStatus(null, now)).toEqual({ state: 'never', days: 0, nextAt: null });
    expect(visitStatus({ startedAt: at(10), nextVisitAt: at(24, 9) }, now)).toMatchObject({ state: 'ok', days: 4 });
    expect(visitStatus({ startedAt: at(10), nextVisitAt: at(20, 8) }, now)).toMatchObject({ state: 'due', days: 0 });
    expect(visitStatus({ startedAt: at(1), nextVisitAt: at(17) }, now)).toMatchObject({ state: 'overdue', days: 3 });
    // No date set: 14 days after the visit.
    expect(visitStatus({ startedAt: at(1), nextVisitAt: null }, now)).toMatchObject({
      state: 'overdue',
      days: 5,
      nextAt: at(1) + 14 * DAY,
    });
  });

  it('orders overdue first, then due, never visited, then scheduled', () => {
    const list = [
      visitStatus({ startedAt: at(10), nextVisitAt: at(30) }, now),
      visitStatus(null, now),
      visitStatus({ startedAt: at(1), nextVisitAt: at(18) }, now),
      visitStatus({ startedAt: at(10), nextVisitAt: at(20) }, now),
      visitStatus({ startedAt: at(1), nextVisitAt: at(12) }, now),
    ];
    const sorted = [...list].sort((a, b) => visitUrgency(b) - visitUrgency(a)).map((s) => [s.state, s.days]);
    expect(sorted).toEqual([
      ['overdue', 8],
      ['overdue', 2],
      ['due', 0],
      ['never', 0],
      ['ok', 10],
    ]);
  });
});

describe('check-up', () => {
  it('is three fixed tasks', () => {
    expect(CHECKUP_STEPS.map((s) => s.gameId)).toEqual(['orientation', 'word_recall', 'reaction_tap']);
  });

  it('scores each task and averages the ones that were done', () => {
    const [orient, recall, tap] = CHECKUP_STEPS;
    const tasks = [
      checkupTask(orient, [
        { correct: true, reactionMs: null },
        { correct: true, reactionMs: null },
        { correct: false, reactionMs: null },
      ]),
      checkupTask(recall, null),
      checkupTask(
        tap,
        Array.from({ length: 6 }, () => ({ correct: true, reactionMs: 1000 })),
      ),
    ];
    expect(tasks[0]).toMatchObject({ score: 67, trials: 3, correct: 2, avgReactionMs: null });
    expect(tasks[1]).toMatchObject({ gameId: 'word_recall', score: null, trials: 0 });
    expect(tasks[2]).toMatchObject({ score: 100, avgReactionMs: 1000 });
    expect(checkupScore(tasks)).toBe(84);
    expect(checkupScore([tasks[1]])).toBeNull();
  });

  it('compares only complete check-ups', () => {
    const [orient, recall, tap] = CHECKUP_STEPS;
    const ok = (step: (typeof CHECKUP_STEPS)[number]) => checkupTask(step, [{ correct: true, reactionMs: 900 }]);
    const full = [ok(orient), ok(recall), ok(tap)];
    const partial = [ok(orient), checkupTask(recall, null), ok(tap)];
    expect(isCompleteCheckup(full)).toBe(true);
    expect(isCompleteCheckup(partial)).toBe(false);
    expect(isCompleteCheckup(null)).toBe(false);
    const visits = [
      { id: 'a', checkup: partial, checkupScore: 97 },
      { id: 'b', checkup: null, checkupScore: null },
      { id: 'c', checkup: full, checkupScore: 63 },
    ];
    expect(comparableCheckups(visits).map((v) => v.id)).toEqual(['c']);
  });
});
