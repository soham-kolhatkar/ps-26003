import { getLevel, insertSession, recentOutcomes, setLevel } from '@/db/repos/games';
import type { DbClient } from '@/db/types';
import { nextLevel, type LevelDecision } from '@/engine/difficulty';
import { computeSessionStats, type SessionStats, type Trial } from '@/engine/scoring';

import type { GameDefinition } from './types';

export type FinishedSession = { stats: SessionStats; decision: LevelDecision | null };

/**
 * Persists a session and, when it was completed, lets the difficulty engine
 * pick the level for next time. Stopped-early sessions are saved (for activity
 * history) but never change the level.
 */
export async function finishSession(
  db: DbClient,
  args: {
    game: Pick<GameDefinition, 'id' | 'maxLevel' | 'targetReactionMs'>;
    patientId: string;
    level: number;
    startedAt: number;
    trials: readonly Trial[];
    completed: boolean;
    now?: number;
  },
): Promise<FinishedSession> {
  const now = args.now ?? Date.now();
  const stats = computeSessionStats(args.trials, args.game.targetReactionMs);

  await insertSession(db, {
    patientId: args.patientId,
    gameId: args.game.id,
    level: args.level,
    startedAt: args.startedAt,
    endedAt: now,
    stats,
    completed: args.completed,
  });

  if (!args.completed) return { stats, decision: null };

  const recent = await recentOutcomes(db, args.patientId, args.game.id);
  const decision = nextLevel(args.level, recent, { maxLevel: args.game.maxLevel });
  await setLevel(db, args.patientId, args.game.id, decision.level, now);
  return { stats, decision };
}

/** Level to start the next session at. */
export function loadLevel(db: DbClient, patientId: string, gameId: string): Promise<number> {
  return getLevel(db, patientId, gameId);
}
