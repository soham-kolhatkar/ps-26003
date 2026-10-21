import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { space } from '@/theme/tokens';

const GAP = space.sm + 4;

/** Side of a square tile for `count` tiles in `columns` columns inside `width` × `height`. */
export function tileSize(count: number, columns: number, width: number, height: number, maxSize: number): number {
  const rows = Math.ceil(count / columns);
  return Math.floor(
    Math.min(maxSize, (width - GAP * (columns - 1)) / columns, (height - GAP * (rows - 1)) / Math.max(1, rows)),
  );
}

/** The column count (1–4) that gives the biggest pictures in this space (fewer columns on a tie). */
export function bestColumns(count: number, width: number, height: number, maxSize: number): number {
  let best = 1;
  for (let c = 2; c <= Math.min(4, count); c++) {
    if (tileSize(count, c, width, height, maxSize) > tileSize(count, best, width, height, maxSize)) best = c;
  }
  return best;
}

/**
 * Fills the space left on the play screen with square tiles (no scrolling, no empty
 * half screen). `children(size)` renders the tiles at the size that fits; without
 * `columns`, the layout with the biggest pictures is chosen.
 */
export function Board({
  count,
  columns: fixed,
  maxSize = 200,
  children,
}: {
  count: number;
  columns?: number;
  maxSize?: number;
  children: (size: number) => ReactNode;
}) {
  const [area, setArea] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ width, height });
  };
  const columns = fixed ?? bestColumns(count, area.width, area.height, maxSize);
  const size = tileSize(count, columns, area.width, area.height, maxSize);
  return (
    <View style={styles.board} onLayout={onLayout}>
      {size > 0 ? (
        <View style={[styles.grid, { width: size * columns + GAP * (columns - 1) }]}>{children(size)}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: GAP },
});
