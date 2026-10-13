import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { AppText } from '@/components/AppText';
import { chart, colors, font, space } from '@/theme/tokens';

import { areaPath, linePath, nearestIndex, segments } from './geometry';

export type LinePoint = { label: string; value: number | null };

type Props = {
  points: readonly LinePoint[];
  /** Top of the value axis (scores: 100). */
  max: number;
  height?: number;
  format?: (v: number) => string;
  /** Readout shown above the plot for the tapped point. */
  readout: (p: LinePoint, index: number) => string;
  emptyText: string;
};

const PAD = { top: 12, right: 36, bottom: 22, left: 30 };
const TICKS = [0, 0.5, 1];

/**
 * Single-series line: 2px line, ~10% wash, solid hairline grid, end-dot with
 * a 2px surface ring, end value direct-labelled. Gaps (no data) stay gaps.
 * Tap anywhere: snaps to the nearest day and shows its readout (crosshair).
 */
export function LineChart({
  points,
  max,
  height = 180,
  format = (v) => String(Math.round(v)),
  readout,
  emptyText,
}: Props) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length <= 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (Math.min(v, max) / max) * plotH;
  const base = PAD.top + plotH;
  const values = points.map((p) => p.value);
  const segs = segments(values, (v, i) => ({ x: x(i), y: y(v) }));
  const lastIdx = values.reduce<number>((acc, v, i) => (v != null ? i : acc), -1);
  const hasData = lastIdx >= 0;
  const sel = selected ?? (hasData ? lastIdx : null);

  const xLabels = points.length ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : [];

  return (
    <View style={styles.wrap}>
      <AppText variant="small" tone="muted" style={styles.readout} accessibilityLiveRegion="polite">
        {hasData && sel != null ? readout(points[sel], sel) : emptyText}
      </AppText>
      <Pressable
        onLayout={onLayout}
        onPress={(e) => hasData && setSelected(nearestIndex(e.nativeEvent.locationX, PAD.left, plotW, points.length))}
        accessibilityRole="adjustable"
        accessibilityLabel={hasData && sel != null ? readout(points[sel], sel) : emptyText}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const cur = sel ?? 0;
          setSelected(
            Math.min(points.length - 1, Math.max(0, cur + (e.nativeEvent.actionName === 'increment' ? 1 : -1))),
          );
        }}
        style={{ height }}
      >
        {width > 0 ? (
          <Svg width={width} height={height}>
            {TICKS.map((t) => (
              <Line
                key={t}
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={y(t * max)}
                y2={y(t * max)}
                stroke={chart.grid}
                strokeWidth={1}
              />
            ))}
            {TICKS.map((t) => (
              <SvgText
                key={`l${t}`}
                x={PAD.left - 6}
                y={y(t * max) + 4}
                fontSize={font.size.caption - 4}
                fill={chart.axisText}
                textAnchor="end"
              >
                {format(t * max)}
              </SvgText>
            ))}
            {xLabels.map((i) => (
              <SvgText
                key={`x${i}`}
                x={x(i)}
                y={height - 4}
                fontSize={font.size.caption - 4}
                fill={chart.axisText}
                textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
              >
                {points[i].label}
              </SvgText>
            ))}

            {sel != null && hasData ? (
              <Line
                x1={x(sel)}
                x2={x(sel)}
                y1={PAD.top}
                y2={base}
                stroke={chart.axisText}
                strokeWidth={1}
                opacity={0.5}
              />
            ) : null}

            {segs.map((seg, i) => (
              <Path key={`a${i}`} d={areaPath(seg, base)} fill={chart.seriesWash} />
            ))}
            {segs.map((seg, i) =>
              seg.length === 1 ? (
                <Circle key={`s${i}`} cx={seg[0].x} cy={seg[0].y} r={3} fill={chart.series} />
              ) : (
                <Path
                  key={`s${i}`}
                  d={linePath(seg)}
                  stroke={chart.series}
                  strokeWidth={2}
                  fill="none"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ),
            )}

            {hasData ? (
              <>
                <Circle cx={x(lastIdx)} cy={y(values[lastIdx]!)} r={6} fill={chart.surface} />
                <Circle cx={x(lastIdx)} cy={y(values[lastIdx]!)} r={4} fill={chart.series} />
                <SvgText
                  x={x(lastIdx) + 8}
                  y={y(values[lastIdx]!) + 4}
                  fontSize={font.size.caption - 2}
                  fontWeight="700"
                  fill={colors.text}
                >
                  {format(values[lastIdx]!)}
                </SvgText>
              </>
            ) : null}
            {sel != null && sel !== lastIdx && values[sel] != null ? (
              <>
                <Circle cx={x(sel)} cy={y(values[sel]!)} r={6} fill={chart.surface} />
                <Circle cx={x(sel)} cy={y(values[sel]!)} r={4} fill={chart.series} />
              </>
            ) : null}
          </Svg>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  readout: { minHeight: 26 },
});
