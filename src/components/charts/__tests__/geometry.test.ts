import { areaPath, columnPath, linePath, nearestIndex, segments } from '../geometry';

describe('chart geometry', () => {
  it('splits a series into segments at gaps', () => {
    const segs = segments([1, 2, null, 4, null, null, 7], (v, i) => ({ x: i, y: v }));
    expect(segs.map((s) => s.map((p) => p.x))).toEqual([[0, 1], [3], [6]]);
  });

  it('builds line, area and column paths', () => {
    expect(
      linePath([
        { x: 0, y: 10 },
        { x: 5, y: 2 },
      ]),
    ).toBe('M0.0,10.0 L5.0,2.0');
    expect(areaPath([{ x: 0, y: 1 }], 10)).toBe('');
    expect(
      areaPath(
        [
          { x: 0, y: 1 },
          { x: 4, y: 2 },
        ],
        10,
      ),
    ).toMatch(/Z$/);
    expect(columnPath(0, 10, 20, 20)).toBe('');
    expect(columnPath(0, 10, 0, 50)).toMatch(/^M0,50 L0,4 Q0,0 4,0/);
  });

  it('snaps taps to the nearest slot', () => {
    expect(nearestIndex(0, 10, 100, 11)).toBe(0);
    expect(nearestIndex(54, 10, 100, 11)).toBe(4);
    expect(nearestIndex(500, 10, 100, 11)).toBe(10);
    expect(nearestIndex(30, 0, 100, 1)).toBe(0);
  });
});
