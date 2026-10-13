import { defaultRng, sample, shuffle, type Rng } from '@/engine/random';

/** Orientation to time, as in standard memory check-ups: today's day, month and year. */
export type QuestionKind = 'weekday' | 'month' | 'year';

export type Question = {
  kind: QuestionKind;
  /** weekday 0–6 (Sunday = 0), month 0–11, or the full year. */
  answer: number;
  options: number[];
};

const CHOICES = 3;

export function makeQuestions(now: number, rng: Rng = defaultRng): Question[] {
  const d = new Date(now);
  const weekday = d.getDay();
  const month = d.getMonth();
  const year = d.getFullYear();
  const others = (all: number[], answer: number) =>
    sample(
      all.filter((x) => x !== answer),
      CHOICES - 1,
      rng,
    );
  const range = (n: number) => Array.from({ length: n }, (_, i) => i);
  return [
    { kind: 'weekday', answer: weekday, options: shuffle([weekday, ...others(range(7), weekday)], rng) },
    { kind: 'month', answer: month, options: shuffle([month, ...others(range(12), month)], rng) },
    // Close years on purpose: being a few years off is the usual mistake.
    { kind: 'year', answer: year, options: shuffle([year, ...others([year - 2, year - 1, year + 1], year)], rng) },
  ];
}

/** Locale names for weekdays / months (Intl, so Hindi and Assamese come for free). */
export function optionLabel(kind: QuestionKind, value: number, locale: string): string {
  if (kind === 'year') return String(value);
  try {
    if (kind === 'weekday') {
      // 4 Oct 2026 was a Sunday.
      return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(new Date(2026, 9, 4 + value));
    }
    return new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2026, value, 1));
  } catch {
    return String(value + 1);
  }
}
