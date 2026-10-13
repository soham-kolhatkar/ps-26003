import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { chart } from '@/theme/tokens';

import { linePath, segments } from './geometry';

/** Tiny trend line: history in the de-emphasis hue, latest point as the accent dot. */
export function Sparkline({
  values,
  max = 100,
  height = 32,
}: {
  values: readonly (number | null)[];
  max?: number;
  height?: number;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const pad = 5;
  const x = (i: number) => pad + (values.length <= 1 ? 0 : (i / (values.length - 1)) * (width - 2 * pad));
  const y = (v: number) => pad + (height - 2 * pad) * (1 - Math.min(v, max) / max);
  const segs = segments(values, (v, i) => ({ x: x(i), y: y(v) }));
  const last = values.reduce<number>((acc, v, i) => (v != null ? i : acc), -1);

  return (
    <View onLayout={onLayout} style={{ height }} importantForAccessibility="no-hide-descendants">
      {width > 0 ? (
        <Svg width={width} height={height}>
          {segs.map((s, i) =>
            s.length > 1 ? (
              <Path
                key={i}
                d={linePath(s)}
                stroke={chart.deemphasis}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null,
          )}
          {last >= 0 ? (
            <>
              <Circle cx={x(last)} cy={y(values[last]!)} r={5} fill={chart.surface} />
              <Circle cx={x(last)} cy={y(values[last]!)} r={3.5} fill={chart.series} />
            </>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}
