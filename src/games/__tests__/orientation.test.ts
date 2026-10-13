import { seededRng } from '@/engine/random';

import { makeQuestions, optionLabel } from '../orientation/rounds';

describe('orientation questions', () => {
  const now = new Date(2026, 9, 13, 11).getTime(); // Tuesday 13 Oct 2026

  it("asks today's weekday, month and year, with 3 distinct choices each", () => {
    const qs = makeQuestions(now, seededRng(1));
    expect(qs.map((q) => [q.kind, q.answer])).toEqual([
      ['weekday', 2],
      ['month', 9],
      ['year', 2026],
    ]);
    for (const q of qs) {
      expect(q.options).toHaveLength(3);
      expect(new Set(q.options).size).toBe(3);
      expect(q.options).toContain(q.answer);
    }
    expect(qs[2].options.every((y) => Math.abs(y - 2026) <= 2)).toBe(true);
  });

  it('names weekdays and months in the language', () => {
    expect(optionLabel('weekday', 0, 'en-IN')).toBe('Sunday');
    expect(optionLabel('weekday', 2, 'en-IN')).toBe('Tuesday');
    expect(optionLabel('month', 9, 'en-IN')).toBe('October');
    expect(optionLabel('year', 2026, 'hi-IN')).toBe('2026');
    expect(optionLabel('month', 0, 'hi-IN')).toBe('जनवरी');
  });
});
