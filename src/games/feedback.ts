import * as Haptics from 'expo-haptics';
import type { TFunction } from 'i18next';

import { pick } from '@/engine/random';

const PRAISE_KEYS = ['feedback.praise1', 'feedback.praise2', 'feedback.praise3', 'feedback.praise4'] as const;

export function randomPraise(t: TFunction): string {
  return t(pick(PRAISE_KEYS));
}

/** Haptics are best-effort: never let them break a game. */
export function hapticSuccess(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Deliberately soft — a wrong answer is not punished. */
export function hapticGentle(): void {
  Haptics.selectionAsync().catch(() => {});
}

/** 1–3 stars, never zero: every finished session is celebrated. */
export function starsFor(accuracy: number): 1 | 2 | 3 {
  if (accuracy >= 0.85) return 3;
  if (accuracy >= 0.6) return 2;
  return 1;
}
