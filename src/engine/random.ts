/** Random number source returning floats in [0, 1). Injectable so game rounds are testable. */
export type Rng = () => number;

/** Small deterministic PRNG (mulberry32) for tests and reproducible demo data. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const defaultRng: Rng = Math.random;

export function randomInt(maxExclusive: number, rng: Rng = defaultRng): number {
  return Math.floor(rng() * maxExclusive);
}

/** Fisher–Yates; returns a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng = defaultRng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1, rng);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** `count` distinct items (or all of them if fewer). */
export function sample<T>(items: readonly T[], count: number, rng: Rng = defaultRng): T[] {
  return shuffle(items, rng).slice(0, Math.max(0, count));
}

export function pick<T>(items: readonly T[], rng: Rng = defaultRng): T {
  if (items.length === 0) throw new Error('pick() from empty list');
  return items[randomInt(items.length, rng)];
}
