import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';

import { AppText } from '@/components/AppText';
import { chart, font, space } from '@/theme/tokens';

import { columnPath } from './geometry';

export type Column = { label: string; value: number | null };

type Props = {
  columns: readonly Column[];
  max: number;
  height?: number;
  format?: (v: number) => string;
  readout: (c: Column, index: number) => string;
  emptyText: string;
};

const PAD = { top: 12, right: 8, bottom: 22, left: 34 };
const TICKS = [0, 0.5, 1];
const MAX_BAR = 24;

/**
 * Single-series columns: ≤24px wide (slot leftover is air), 4px rounded
 * data-end, square at a single baseline. Tap a column for its readout.
 */
export function ColumnChart({
  columns,
  max,
  height = 160,
  format = (v) => String(Math.round(v)),
  readout,
  emptyText,
}: Props) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const slot = columns.length ? plotW / columns.length : 0;
  const barW = Math.max(2, Math.min(MAX_BAR, slot - 2, slot * 0.6));
  const base = PAD.top + plotH;
  const y = (v: number) => base - (Math.min(v, max) / max) * plotH;
  const lastIdx = columns.reduce<number>((acc, c, i) => (c.value != null ? i : acc), -1);
  const sel = selected ?? (lastIdx >= 0 ? lastIdx : null);
  const xLabels = columns.length ? [0, Math.floor((columns.length - 1) / 2), columns.length - 1] : [];

  return (
    <View style={styles.wrap}>
      <AppText variant="small" tone="muted" style={styles.readout} accessibilityLiveRegion="polite">
        {sel != null ? readout(columns[sel], sel) : emptyText}
      </AppText>
      <View onLayout={onLayout} style={{ height }}>
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
            {columns.map((c, i) => {
              const cx = PAD.left + slot * i + (slot - barW) / 2;
              return c.value == null || c.value <= 0 ? null : (
                <Path
                  key={i}
                  d={columnPath(cx, barW, y(c.value), base)}
                  fill={chart.series}
                  opacity={sel === i || sel == null ? 1 : 0.55}
                />
              );
            })}
            {xLabels.map((i) => (
              <SvgText
                key={`x${i}`}
                x={PAD.left + slot * i + slot / 2}
                y={height - 4}
                fontSize={font.size.caption - 4}
                fill={chart.axisText}
                textAnchor={i === 0 ? 'start' : i === columns.length - 1 ? 'end' : 'middle'}
              >
                {columns[i].label}
              </SvgText>
            ))}
          </Svg>
        ) : null}
        {/* Each full-height slot is the tap target (bigger than the bar). */}
        <View style={[StyleSheet.absoluteFill, styles.hitRow, { left: PAD.left, right: PAD.right }]}>
          {columns.map((c, i) => (
            <Pressable
              key={i}
              style={styles.hit}
              onPress={() => setSelected(i)}
              accessibilityRole="button"
              accessibilityLabel={readout(c, i)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  readout: { minHeight: 26 },
  hitRow: { flexDirection: 'row' },
  hit: { flex: 1 },
});
