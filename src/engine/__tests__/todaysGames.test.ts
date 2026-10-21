import { pickTodaysGames } from '@/engine/todaysGames';

const GAMES = ['memory_match', 'routine_sequence', 'object_recognition', 'odd_one_out', 'pattern', 'reaction_tap'];
const DAY = 86_400_000;
const today = Date.UTC(2026, 9, 21);

describe("today's games", () => {
  it('picks three, never-played and least recently played first', () => {
    const last = {
      memory_match: today - 1 * DAY,
      routine_sequence: today - 5 * DAY,
      object_recognition: today - 2 * DAY,
      odd_one_out: today - 9 * DAY,
      pattern: today - 3 * DAY,
      // reaction_tap: never played
    };
    expect(pickTodaysGames(GAMES, last, today)).toEqual(['reaction_tap', 'odd_one_out', 'routine_sequence']);
  });

  it('is the same all day for the same history', () => {
    const a = pickTodaysGames(GAMES, {}, today);
    expect(pickTodaysGames(GAMES, {}, today + 0)).toEqual(a);
    expect(a).toHaveLength(3);
    expect(new Set(a).size).toBe(3);
  });

  it('breaks ties differently on different days', () => {
    const days = Array.from({ length: 7 }, (_, i) => pickTodaysGames(GAMES, {}, today + i * DAY).join(','));
    expect(new Set(days).size).toBeGreaterThan(1);
  });

  it('works with fewer games than asked for', () => {
    expect(pickTodaysGames(['pattern', 'reaction_tap'], {}, today).sort()).toEqual(['pattern', 'reaction_tap']);
  });
});
