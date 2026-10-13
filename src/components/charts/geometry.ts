/** Shared chart geometry helpers (pure). */
export type Pt = { x: number; y: number };

/** Contiguous runs of non-null values → separate line segments (gaps stay gaps). */
export function segments(values: readonly (number | null)[], toPt: (v: number, i: number) => Pt): Pt[][] {
  const out: Pt[][] = [];
  let run: Pt[] = [];
  values.forEach((v, i) => {
    if (v == null) {
      if (run.length) out.push(run);
      run = [];
    } else run.push(toPt(v, i));
  });
  if (run.length) out.push(run);
  return out;
}

export const linePath = (pts: readonly Pt[]) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

export const areaPath = (pts: readonly Pt[], baseY: number) =>
  pts.length < 2
    ? ''
    : `${linePath(pts)} L${pts[pts.length - 1].x.toFixed(1)},${baseY} L${pts[0].x.toFixed(1)},${baseY} Z`;

/** Column with a 4px rounded data-end and a square baseline. */
export function columnPath(x: number, w: number, top: number, base: number, r = 4): string {
  const h = base - top;
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${base} L${x},${top + rr} Q${x},${top} ${x + rr},${top} L${x + w - rr},${top} Q${x + w},${top} ${x + w},${top + rr} L${x + w},${base} Z`;
}

/** Index of the slot nearest to a tap at `px` across `count` evenly spaced slots. */
export function nearestIndex(px: number, left: number, width: number, count: number): number {
  if (count <= 1) return 0;
  const step = width / (count - 1);
  return Math.min(count - 1, Math.max(0, Math.round((px - left) / step)));
}
