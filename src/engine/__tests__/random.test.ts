import { pick, sample, seededRng, shuffle } from '../random';

describe('random helpers', () => {
  it('seededRng is deterministic', () => {
    const a = seededRng(42);
    const b = seededRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('shuffle keeps all items and does not mutate', () => {
    const items = [1, 2, 3, 4, 5];
    const out = shuffle(items, seededRng(1));
    expect([...out].sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });

  it('sample returns distinct items', () => {
    const out = sample(['a', 'b', 'c', 'd'], 3, seededRng(7));
    expect(new Set(out).size).toBe(3);
    expect(sample(['a'], 5)).toEqual(['a']);
  });

  it('pick throws on empty input', () => {
    expect(() => pick([])).toThrow();
  });
});
