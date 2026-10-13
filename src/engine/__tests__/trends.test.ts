import type { OccurrencePoint, SessionPoint } from '../progress';
import {
  detectAlerts,
  detectGameDecline,
  detectInactivity,
  detectLowAdherence,
  performanceIndex,
  windows,
} from '../trends';

const at = (d: number, h = 10) => new Date(2026, 9, d, h).getTime();
const now = at(28, 18); // Wed 28 Oct 2026; recent window = 22..28 Oct, baseline = 1..21 Oct

const s = (d: number, level: number, score: number, gameId = 'memory_match', completed = true): SessionPoint => ({
  gameId,
  startedAt: at(d),
  endedAt: at(d) + 120000,
  level,
  score,
  completed,
});

describe('performanceIndex', () => {
  it('combines level and score on a 0..100 scale', () => {
    expect(performanceIndex(1, 0)).toBe(0);
    expect(performanceIndex(5, 100)).toBe(100);
    expect(performanceIndex(3, 50)).toBe(50);
    // A level drop weighs more than a score dip inside a level.
    expect(performanceIndex(3, 80) - performanceIndex(2, 80)).toBeGreaterThan(
      performanceIndex(3, 80) - performanceIndex(3, 60),
    );
    expect(performanceIndex(9, 140)).toBe(100);
  });
});

describe('windows', () => {
  it('recent = last 7 days incl. today, baseline = the 21 days before', () => {
    const { recentFrom, baselineFrom } = windows(now);
    expect(recentFrom).toBe(new Date(2026, 9, 22).getTime());
    expect(baselineFrom).toBe(new Date(2026, 9, 1).getTime());
  });
});

describe('detectGameDecline', () => {
  const baseline = [2, 4, 6, 9, 12, 15].map((d) => s(d, 3, 78)); // index ≈ 55.6
  it('flags a sustained drop against the patient’s own earlier weeks', () => {
    // Index ≈ 55.6 before, ≈ 43.8 now (one level drop, lower scores at level 3): ≈ 21% lower.
    const a = detectGameDecline([...baseline, s(23, 3, 30), s(25, 3, 32), s(27, 2, 95)], 'memory_match', now);
    expect(a?.kind).toBe('game_decline');
    expect(a?.severity).toBe('warning');
    expect(a?.detail).toMatchObject({ dropPct: 21, baselineSessions: 6, recentSessions: 3 });
    expect(a?.detail.dropPct).toBeGreaterThanOrEqual(15);
  });

  it('is serious from a 25% drop', () => {
    const a = detectGameDecline([...baseline, s(23, 2, 40), s(25, 2, 45), s(27, 1, 90)], 'memory_match', now);
    expect(a?.severity).toBe('serious');
  });

  it('ignores small dips, improvements and other games', () => {
    expect(detectGameDecline([...baseline, s(23, 3, 70), s(25, 3, 65), s(27, 3, 72)], 'memory_match', now)).toBeNull();
    expect(detectGameDecline([...baseline, s(23, 4, 70), s(25, 4, 75), s(27, 4, 80)], 'memory_match', now)).toBeNull();
    expect(detectGameDecline([...baseline, s(23, 1, 50), s(25, 1, 50), s(27, 1, 50)], 'pattern', now)).toBeNull();
  });

  it('needs enough sessions on both sides', () => {
    const fewRecent = [...baseline, s(23, 1, 40), s(25, 1, 40)];
    expect(detectGameDecline(fewRecent, 'memory_match', now)).toBeNull();
    const fewBaseline = [s(10, 3, 80), s(12, 3, 80), s(23, 1, 40), s(25, 1, 40), s(27, 1, 40)];
    expect(detectGameDecline(fewBaseline, 'memory_match', now)).toBeNull();
    const stopped = [
      ...baseline,
      s(23, 1, 10, 'memory_match', false),
      s(25, 1, 10, 'memory_match', false),
      s(27, 1, 10),
    ];
    expect(detectGameDecline(stopped, 'memory_match', now)).toBeNull();
  });

  it('does not mistake a new patient climbing the levels for anything', () => {
    const climbing = [
      s(2, 1, 60),
      s(5, 1, 85),
      s(8, 2, 70),
      s(11, 2, 88),
      s(14, 3, 70),
      s(23, 3, 78),
      s(25, 4, 70),
      s(27, 4, 76),
    ];
    expect(detectGameDecline(climbing, 'memory_match', now)).toBeNull();
  });
});

describe('detectLowAdherence', () => {
  const dose = (d: number, status: OccurrencePoint['status'], type: OccurrencePoint['type'] = 'medicine') => ({
    dueAt: at(d, 9),
    status,
    type,
  });
  it('flags medicine taken less than 70% of the time this week', () => {
    const occ = [dose(22, 'taken'), dose(23, 'pending'), dose(24, 'taken'), dose(25, 'pending'), dose(26, 'taken')];
    expect(detectLowAdherence(occ, now)).toMatchObject({
      severity: 'warning',
      detail: { taken: 3, decided: 5, ratePct: 60, days: 7 },
    });
    const worse = [dose(22, 'pending'), dose(23, 'pending'), dose(24, 'skipped'), dose(25, 'taken')];
    expect(detectLowAdherence(worse, now)?.severity).toBe('serious');
  });

  it('ignores other reminder types, old weeks, undecided doses and too few doses', () => {
    const water = [22, 23, 24, 25, 26].map((d) => dose(d, 'pending', 'hydration'));
    expect(detectLowAdherence(water, now)).toBeNull();
    const old = [10, 11, 12, 13, 14].map((d) => dose(d, 'pending'));
    expect(detectLowAdherence(old, now)).toBeNull();
    expect(detectLowAdherence([dose(26, 'pending'), dose(27, 'pending'), dose(26, 'taken')], now)).toBeNull();
    // Today's 17:00 dose is still "due" at 18:00 — not counted as missed yet.
    const today = [
      dose(25, 'taken'),
      dose(26, 'taken'),
      dose(27, 'taken'),
      { dueAt: at(28, 17), status: 'pending' as const, type: 'medicine' as const },
    ];
    expect(detectLowAdherence(today, now)).toBeNull();
  });
});

describe('detectInactivity', () => {
  const habit = [3, 6, 9, 12, 15, 18, 21].map((d) => s(d, 2, 70));
  it('notes a broken habit after 4 days without play', () => {
    expect(detectInactivity(habit, now)).toMatchObject({
      severity: 'info',
      detail: { days: 7, lastPlayedAt: at(21), baselineSessions: 7 },
    });
    expect(detectInactivity([...habit, s(25, 2, 70)], now)).toBeNull();
  });

  it('stays quiet for patients who rarely or never played', () => {
    expect(detectInactivity([], now)).toBeNull();
    expect(detectInactivity([s(10, 1, 70), s(14, 1, 70)], now)).toBeNull();
  });
});

describe('detectAlerts', () => {
  it('returns every alert, most serious first, with stable keys', () => {
    const baseline = [2, 4, 6, 9, 12, 15].map((d) => s(d, 3, 78, 'pattern'));
    const sessions = [...baseline, s(23, 1, 50, 'pattern'), s(24, 1, 50, 'pattern'), s(24, 1, 60, 'pattern')];
    const occ = [22, 23, 24, 25, 26].map(
      (d) => ({ dueAt: at(d, 9), status: d % 2 ? 'pending' : 'taken', type: 'medicine' }) as const,
    );
    const alerts = detectAlerts({ sessions, occurrences: occ, now });
    expect(alerts.map((a) => [a.key, a.severity])).toEqual([
      ['game_decline:pattern', 'serious'],
      ['adherence_low', 'warning'],
      ['inactive', 'info'],
    ]);
  });
});
