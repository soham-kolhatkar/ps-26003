/**
 * "Today's games" on the patient home (D50): three games, the least recently played
 * first, so every game comes round. Plays from today are ignored, so the three tiles do
 * not change in the middle of the day; ties (e.g. never played) are broken by a hash of
 * the day, so the order varies from one day to the next.
 */
export function pickTodaysGames(
  available: readonly string[],
  /** Last start time of each game before today (ms); missing = never played. */
  lastPlayedBeforeToday: Readonly<Record<string, number | undefined>>,
  /** Any time on the day (local midnight works best). */
  day: number,
  count = 3,
): string[] {
  const dayIndex = Math.floor(day / 86_400_000);
  return [...available]
    .sort(
      (a, b) =>
        (lastPlayedBeforeToday[a] ?? -Infinity) - (lastPlayedBeforeToday[b] ?? -Infinity) ||
        hash(`${dayIndex}:${a}`) - hash(`${dayIndex}:${b}`),
    )
    .slice(0, count);
}

/** FNV-1a, 32 bit: a stable, well-spread number for a short string. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}
