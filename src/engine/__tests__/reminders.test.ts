import {
  adherence,
  DUE_SOON_MS,
  eventState,
  MISSED_AFTER_MS,
  normalizeTimes,
  occurrencesBetween,
  parseTime,
  startOfDay,
} from '../reminders';

const day = new Date(2026, 9, 13).getTime(); // local midnight, 13 Oct 2026
const at = (h: number, m = 0, d = 0) => new Date(2026, 9, 13 + d, h, m).getTime();

describe('time parsing', () => {
  it('parses and validates HH:MM', () => {
    expect(parseTime('08:05')).toEqual({ hour: 8, minute: 5 });
    expect(parseTime('7:30')).toEqual({ hour: 7, minute: 30 });
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('08:60')).toBeNull();
    expect(parseTime('morning')).toBeNull();
  });

  it('normalizes: drops invalid, de-duplicates, sorts', () => {
    expect(normalizeTimes(['20:00', '8:00', '08:00', 'x', '13:30'])).toEqual(['08:00', '13:30', '20:00']);
  });
});

describe('occurrencesBetween', () => {
  it('expands daily times per day within the range', () => {
    const daily = { kind: 'daily' as const, times: ['20:00', '08:00'] };
    expect(occurrencesBetween(daily, day, day + 24 * 3600e3)).toEqual([at(8), at(20)]);
    expect(occurrencesBetween(daily, at(9), at(9, 0, 2))).toEqual([at(20), at(8, 0, 1), at(20, 0, 1), at(8, 0, 2)]);
  });

  it('returns a one-off only when inside the range', () => {
    const once = { kind: 'once' as const, at: at(10, 30, 3) };
    expect(occurrencesBetween(once, day, at(0, 0, 3))).toEqual([]);
    expect(occurrencesBetween(once, day, at(0, 0, 4))).toEqual([at(10, 30, 3)]);
  });

  it('startOfDay is local midnight', () => {
    expect(startOfDay(at(15, 45))).toBe(day);
  });
});

describe('eventState + adherence', () => {
  const due = at(8);
  it('moves upcoming → due → missed over time', () => {
    expect(eventState('pending', due, due - DUE_SOON_MS - 1)).toBe('upcoming');
    expect(eventState('pending', due, due - DUE_SOON_MS)).toBe('due');
    expect(eventState('pending', due, due + MISSED_AFTER_MS)).toBe('due');
    expect(eventState('pending', due, due + MISSED_AFTER_MS + 1)).toBe('missed');
    expect(eventState('taken', due, due + 10 * MISSED_AFTER_MS)).toBe('taken');
    expect(eventState('skipped', due, due)).toBe('skipped');
  });

  it('counts only decided occurrences', () => {
    const now = at(23);
    const result = adherence(
      [
        { status: 'taken', dueAt: at(8) },
        { status: 'pending', dueAt: at(9) }, // missed
        { status: 'skipped', dueAt: at(13) },
        { status: 'pending', dueAt: at(22, 30) }, // still due
        { status: 'pending', dueAt: at(8, 0, 1) }, // upcoming
      ],
      now,
    );
    expect(result).toEqual({ taken: 1, missed: 1, skipped: 1, total: 3, rate: 1 / 3 });
    expect(adherence([], now).rate).toBeNull();
  });
});
