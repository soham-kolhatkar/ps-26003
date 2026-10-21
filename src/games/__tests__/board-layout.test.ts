import { bestColumns, tileSize } from '@/games/ui/Board';

describe('game board layout', () => {
  it('picks the columns that give the biggest pictures', () => {
    // A phone's play area (about 372 × 480 dp): 5 pictures fit best two per row.
    expect(bestColumns(5, 372, 480, 200)).toBe(2);
    expect(tileSize(5, 2, 372, 480, 200)).toBeGreaterThan(tileSize(5, 3, 372, 480, 200));
    // A wide, short space: three answers side by side.
    expect(bestColumns(3, 372, 120, 200)).toBe(3);
    // Never bigger than the cap.
    expect(tileSize(1, 1, 372, 480, 200)).toBe(200);
  });
});
