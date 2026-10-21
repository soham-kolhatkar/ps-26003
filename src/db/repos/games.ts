import type { SessionOutcome } from '@/engine/difficulty';
import type { SessionStats } from '@/engine/scoring';

import { newId } from '../ids';
import type { DbClient } from '../types';

export type GameSessionRow = {
  id: string;
  patient_id: string;
  game_id: string;
  level: number;
  started_at: number;
  ended_at: number | null;
  trials: number;
  correct: number;
  accuracy: number | null;
  avg_reaction_ms: number | null;
  score: number | null;
  completed: number;
  source: string;
};

export type GameSession = {
  id: string;
  patientId: string;
  gameId: string;
  level: number;
  startedAt: number;
  endedAt: number | null;
  stats: SessionStats;
  completed: boolean;
  source: string;
};

function toSession(r: GameSessionRow): GameSession {
  return {
    id: r.id,
    patientId: r.patient_id,
    gameId: r.game_id,
    level: r.level,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    stats: {
      trials: r.trials,
      correct: r.correct,
      accuracy: r.accuracy ?? 0,
      avgReactionMs: r.avg_reaction_ms,
      score: r.score ?? 0,
    },
    completed: r.completed === 1,
    source: r.source,
  };
}

export async function getLevel(db: DbClient, patientId: string, gameId: string): Promise<number> {
  const row = await db.getFirstAsync<{ level: number }>(
    'SELECT level FROM game_level WHERE patient_id = ? AND game_id = ?',
    [patientId, gameId],
  );
  return row?.level ?? 1;
}

export async function setLevel(db: DbClient, patientId: string, gameId: string, level: number, now = Date.now()) {
  await db.runAsync(
    `INSERT INTO game_level (patient_id, game_id, level, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(patient_id, game_id) DO UPDATE SET level = excluded.level, updated_at = excluded.updated_at`,
    [patientId, gameId, level, now],
  );
}

export type NewSession = {
  patientId: string;
  gameId: string;
  level: number;
  startedAt: number;
  endedAt: number;
  stats: SessionStats;
  completed: boolean;
  source?: 'app' | 'seed';
};

export async function insertSession(db: DbClient, s: NewSession): Promise<string> {
  const id = newId();
  await db.runAsync(
    `INSERT INTO game_session (id, patient_id, game_id, level, started_at, ended_at, trials, correct,
       accuracy, avg_reaction_ms, score, completed, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      s.patientId,
      s.gameId,
      s.level,
      s.startedAt,
      s.endedAt,
      s.stats.trials,
      s.stats.correct,
      s.stats.accuracy,
      s.stats.avgReactionMs,
      s.stats.score,
      s.completed ? 1 : 0,
      s.source ?? 'app',
    ],
  );
  return id;
}

/** Completed sessions for one game, newest first — input for the difficulty engine. */
export async function recentOutcomes(
  db: DbClient,
  patientId: string,
  gameId: string,
  limit = 10,
): Promise<SessionOutcome[]> {
  return db.getAllAsync<SessionOutcome>(
    `SELECT level, accuracy, avg_reaction_ms AS avgReactionMs
     FROM game_session
     WHERE patient_id = ? AND game_id = ? AND completed = 1
     ORDER BY started_at DESC
     LIMIT ?`,
    [patientId, gameId, limit],
  );
}

export async function listSessions(
  db: DbClient,
  patientId: string,
  opts: { gameId?: string; since?: number; limit?: number } = {},
): Promise<GameSession[]> {
  const where = ['patient_id = ?'];
  const params: (string | number)[] = [patientId];
  if (opts.gameId) {
    where.push('game_id = ?');
    params.push(opts.gameId);
  }
  if (opts.since != null) {
    where.push('started_at >= ?');
    params.push(opts.since);
  }
  params.push(opts.limit ?? 500);
  const rows = await db.getAllAsync<GameSessionRow>(
    `SELECT * FROM game_session WHERE ${where.join(' AND ')} ORDER BY started_at DESC LIMIT ?`,
    params,
  );
  return rows.map(toSession);
}

/** Last start time of each game before `before` (completed or not), for "today's games". */
export async function lastPlayedByGame(
  db: DbClient,
  patientId: string,
  before: number,
): Promise<Record<string, number>> {
  const rows = await db.getAllAsync<{ game_id: string; at: number }>(
    'SELECT game_id, MAX(started_at) AS at FROM game_session WHERE patient_id = ? AND started_at < ? GROUP BY game_id',
    [patientId, before],
  );
  return Object.fromEntries(rows.map((r) => [r.game_id, r.at]));
}
