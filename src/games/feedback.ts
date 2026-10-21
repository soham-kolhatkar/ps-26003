import * as Haptics from 'expo-haptics';
import type { TFunction } from 'i18next';
import { Platform } from 'react-native';

import { pick } from '@/engine/random';

const PRAISE_KEYS = ['feedback.praise1', 'feedback.praise2', 'feedback.praise3', 'feedback.praise4'] as const;

export function randomPraise(t: TFunction): string {
  return t(pick(PRAISE_KEYS));
}

/**
 * Haptics are best-effort: never let them break a game. Android uses the system's
 * own gentle patterns (no VIBRATE permission); never Error/Reject/Heavy (D50).
 */
export function hapticSuccess(): void {
  const done =
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm)
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  done.catch(() => {});
}

/** Deliberately soft — a wrong answer is not punished. */
export function hapticGentle(): void {
  const done =
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick)
      : Haptics.selectionAsync();
  done.catch(() => {});
}

/** 1–3 stars, never zero: every finished session is celebrated. */
export function starsFor(accuracy: number): 1 | 2 | 3 {
  if (accuracy >= 0.85) return 3;
  if (accuracy >= 0.6) return 2;
  return 1;
}
