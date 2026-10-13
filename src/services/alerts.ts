import { syncAlerts } from '@/db/repos/alerts';
import { listSessions } from '@/db/repos/games';
import { listOccurrences } from '@/db/repos/reminders';
import type { DbClient } from '@/db/types';
import { detectAlerts, windows } from '@/engine/trends';

const DAY = 24 * 60 * 60 * 1000;

/** Refreshes run one after another (screens can load twice at once, e.g. mount + focus). */
let queue: Promise<void> = Promise.resolve();

/**
 * Re-runs trend detection for one patient and stores the result. Local and
 * cheap: staff screens call it when they load. Never throws — alerts are an
 * extra, and a failure here must not blank the screen that asked.
 */
export function refreshAlerts(db: DbClient, patientId: string, now = Date.now()): Promise<void> {
  const run = queue.then(() => refreshNow(db, patientId, now));
  queue = run.catch((e) => console.warn(`Alert refresh failed for ${patientId}`, e));
  return queue;
}

async function refreshNow(db: DbClient, patientId: string, now: number): Promise<void> {
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
