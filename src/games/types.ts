import type { ComponentType } from 'react';

import type { Trial } from '@/engine/scoring';

export type GameId =
  'object_recognition' | 'memory_match' | 'routine_sequence' | 'photo_recall' | 'reaction_tap' | 'word_recall';

/** Props every game component receives from GameShell. */
export type GameProps = {
  /** Difficulty level chosen by the adaptive engine (1..maxLevel). */
  level: number;
  /** Number of trials (rounds) to play this session. */
  totalTrials: number;
  /** Report one trial (first-try result). The shell tracks progress from this. */
  onTrial: (trial: Trial) => void;
  /**
   * Optional: report progress when it isn't one-trial-per-round
   * (e.g. memory match reports pairs found / total pairs).
   */
  onProgress: (done: number, total: number) => void;
  /** All rounds finished. */
  onComplete: () => void;
  /** Speak text in the current language (stops any previous speech). */
  say: (text: string) => void;
};

export type GameDefinition = {
  id: GameId;
  /** Emoji shown on the home tile and intro. */
  icon: string;
  maxLevel: number;
  trialsPerSession: number;
  /** Comfortable answer time used by scoring (ms). */
  targetReactionMs: number;
  Component: ComponentType<GameProps>;
};
