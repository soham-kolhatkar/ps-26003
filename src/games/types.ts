import type { ComponentType } from 'react';

import type { DbClient } from '@/db/types';
import type { Trial } from '@/engine/scoring';

export type GameId =
  | 'object_recognition'
  | 'memory_match'
  | 'routine_sequence'
  | 'photo_recall'
  | 'odd_one_out'
  | 'pattern'
  | 'reaction_tap'
  | 'word_recall';

/** Props every game component receives from GameShell. */
export type GameProps = {
  /** Patient playing (for games with personal content, e.g. family photos). */
  patientId: string;
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
  /**
   * Speak text in the current language (stops any previous speech).
   * Resolves when the speech has finished — await it before auto-advancing
   * so sentences are never cut off.
   */
  say: (text: string) => Promise<void>;
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
  /** Optional: hide the game until it can be played (e.g. needs family photos). */
  isAvailable?: (db: DbClient, patientId: string) => Promise<boolean>;
};
