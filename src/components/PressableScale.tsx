import { useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { motion } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
};

/**
 * Pressable that settles to 97% while held (120 ms down, 200 ms back, no bounce).
 * withTiming follows the phone's "Remove animations" setting (ReduceMotion.System).
 */
export function PressableScale({ style, onPressIn, onPressOut, disabled, ...rest }: PressableScaleProps) {
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const resolved = typeof style === 'function' ? style({ pressed }) : style;

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={(e) => {
        setPressed(true);
        scale.set(withTiming(0.97, { duration: motion.press }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        scale.set(withTiming(1, { duration: motion.release }));
        onPressOut?.(e);
      }}
      style={[resolved, animated]}
      {...rest}
    />
  );
}
