import { syncAlerts } from '@/db/repos/alerts';
import { listSessions } from '@/db/repos/games';
import { listOccurrences } from '@/db/repos/reminders';
import type { DbClient } from '@/db/types';
import { detectAlerts, windows } from '@/engine/trends';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Re-runs trend detection for one patient and stores the result. Local and
 * cheap: staff screens call it when they load, the game shell after a session.
 */
export async function refreshAlerts(db: DbClient, patientId: string, now = Date.now()): Promise<void> {
  const { baselineFrom } = windows(now);
  const sessions = (await listSessions(db, patientId, { since: baselineFrom, limit: 2000 })).map((s) => ({
    gameId: s.gameId,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    level: s.level,
    score: s.stats.score,
    completed: s.completed,
  }));
  const occurrences = (await listOccurrences(db, patientId, baselineFrom, now + DAY)).map((o) => ({
    dueAt: o.dueAt,
    status: o.status,
    type: o.type,
  }));
  await syncAlerts(db, patientId, detectAlerts({ sessions, occurrences, now }), now);
}
