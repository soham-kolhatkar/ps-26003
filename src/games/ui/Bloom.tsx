import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { Picture } from '@/components/Picture';
import { colors, motion, radius } from '@/theme/tokens';

const PETALS = [
  { angle: -90, color: '#F4D7E0' },
  { angle: -30, color: colors.tint.sun },
  { angle: 30, color: colors.tint.lilac },
  { angle: 90, color: '#F4D7E0' },
  { angle: 150, color: colors.tint.sun },
  { angle: 210, color: colors.tint.lilac },
];

/**
 * End of a game (D50): one slow bloom, then still. The flower settles in, a few soft petals
 * drift outward. No flashing, no bounce; with "Remove animations" it simply appears.
 */
export function Bloom({ glyph = '🌼', size = 240 }: { glyph?: string; size?: number }) {
  const grow = useSharedValue(0.85);
  const show = useSharedValue(0);
  useEffect(() => {
    grow.set(withTiming(1, { duration: motion.celebrate * 0.45, easing: Easing.out(Easing.cubic) }));
    show.set(withTiming(1, { duration: motion.celebrate * 0.3 }));
  }, [grow, show]);
  const flower = useAnimatedStyle(() => ({ opacity: show.get(), transform: [{ scale: grow.get() }] }));

  return (
    <View style={{ width: size, height: size }} importantForAccessibility="no-hide-descendants">
      <View style={[styles.ring, { borderRadius: size / 2 }]} />
      <View
        style={[
          styles.inner,
          { top: size * 0.12, left: size * 0.12, right: size * 0.12, bottom: size * 0.12, borderRadius: size },
        ]}
      />
      {PETALS.map((p, i) => (
        <Petal key={i} angle={p.angle} color={p.color} size={size} delay={i * 90} />
      ))}
      <Animated.View style={[styles.center, flower]}>
        <Picture glyph={glyph} size={size * 0.62} />
      </Animated.View>
    </View>
  );
}

function Petal({ angle, color, size, delay }: { angle: number; color: string; size: number; delay: number }) {
  const out = useSharedValue(0);
  useEffect(() => {
    out.set(withDelay(delay, withTiming(1, { duration: motion.celebrate * 0.8, easing: Easing.out(Easing.quad) })));
  }, [out, delay]);
  const rad = (angle * Math.PI) / 180;
  const style = useAnimatedStyle(() => {
    const d = size * (0.3 + 0.17 * out.get());
    return {
      opacity: 0.35 + 0.65 * out.get(),
      transform: [{ translateX: Math.cos(rad) * d }, { translateY: Math.sin(rad) * d }],
    };
  });
  const dot = Math.round(size * 0.07);
  return (
    <Animated.View
      style={[
        styles.petal,
        {
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: color,
          left: size / 2 - dot / 2,
          top: size / 2 - dot / 2,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.primarySoft },
  inner: { position: 'absolute', backgroundColor: colors.primaryWash },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petal: { position: 'absolute', borderRadius: radius.pill },
});
