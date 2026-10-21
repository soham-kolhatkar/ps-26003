import { progressHighlights, type HighlightInput } from '@/engine/highlights';

const base: HighlightInput = {
  alerts: [],
  sessions: 10,
  activeDays: 5,
  periodDays: 7,
  scoreTrend: 'steady',
  remindersTaken: 29,
  remindersDecided: 36,
};
const keys = (x: HighlightInput) => progressHighlights(x).map((h) => `${h.status}:${h.key}`);

describe('progress summary', () => {
  it('a good week: steady scores, days played, reminders taken', () => {
    expect(keys(base)).toEqual(['well:scoresSteady', 'well:played', 'well:reminders']);
  });

  it('alerts come first, in amber or red, and replace the calm score line', () => {
    const x = {
      ...base,
      alerts: [
        { kind: 'game_decline' as const, serious: true, gameId: 'object_recognition' },
        { kind: 'adherence_low' as const, serious: false, ratePct: 50 },
      ],
    };
    expect(keys(x)).toEqual(['urgent:gameDecline', 'soon:adherenceLow', 'well:played']);
    expect(progressHighlights(x)[0].params).toEqual({ gameId: 'object_recognition' });
  });

  it('few days played or few reminders taken is information, not a warning', () => {
    expect(keys({ ...base, activeDays: 2, remindersTaken: 10, scoreTrend: 'down' })).toEqual([
      'info:scoresDown',
      'info:played',
      'info:reminders',
    ]);
  });

  it('no games in the period', () => {
    expect(keys({ ...base, sessions: 0, activeDays: 0, scoreTrend: null, remindersDecided: 0 })).toEqual([
      'info:noGames',
    ]);
  });

  it('never more than three lines', () => {
    const x = {
      ...base,
      alerts: [
        { kind: 'inactive' as const, serious: false, days: 4 },
        { kind: 'game_decline' as const, serious: false, gameId: 'pattern' },
        { kind: 'adherence_low' as const, serious: false, ratePct: 40 },
      ],
    };
    expect(progressHighlights(x)).toHaveLength(3);
  });
});
