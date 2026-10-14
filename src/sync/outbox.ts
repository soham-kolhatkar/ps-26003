/**
 * Local change tracking for sync (D42): SQLite triggers write an outbox row for
 * every change to a synced table. Created only in cloud databases (never in the
 * demo DB), and silent while a pull is being applied (`sync_flag.applying = 1`).
 * Repos stay unchanged: no write path can forget to record itself.
 */
import type { DbClient } from '@/db/types';

/** Local tables that sync, in push / pull order (parents before children). */
export const SYNCED_TABLES = ['reminder', 'reminder_event', 'game_session', 'game_level', 'visit'] as const;
export type SyncedTable = (typeof SYNCED_TABLES)[number];

const QUIET = '(SELECT applying FROM sync_flag WHERE id = 1) = 0';

function triggers(tbl: SyncedTable, key: string, keyOld: string, extraWhen = ''): string {
  const when = `${QUIET}${extraWhen}`;
  return `
CREATE TRIGGER IF NOT EXISTS sync_${tbl}_ins AFTER INSERT ON ${tbl} WHEN ${when}
BEGIN INSERT INTO sync_outbox (tbl, row_id, op) VALUES ('${tbl}', ${key}, 'upsert'); END;
CREATE TRIGGER IF NOT EXISTS sync_${tbl}_upd AFTER UPDATE ON ${tbl} WHEN ${when}
BEGIN INSERT INTO sync_outbox (tbl, row_id, op) VALUES ('${tbl}', ${key}, 'upsert'); END;
CREATE TRIGGER IF NOT EXISTS sync_${tbl}_del AFTER DELETE ON ${tbl} WHEN ${QUIET}
BEGIN INSERT INTO sync_outbox (tbl, row_id, op) VALUES ('${tbl}', ${keyOld}, 'delete'); END;`;
}

export const OUTBOX_TRIGGERS_SQL = [
  triggers('reminder', 'NEW.id', 'OLD.id'),
  // Only decided doses travel; "pending" is what every phone computes for itself.
  triggers('reminder_event', 'NEW.id', 'OLD.id', " AND NEW.status <> 'pending'"),
  triggers('game_session', 'NEW.id', 'OLD.id'),
  triggers('game_level', "NEW.patient_id || '|' || NEW.game_id", "OLD.patient_id || '|' || OLD.game_id"),
  triggers('visit', 'NEW.id', 'OLD.id'),
].join('\n');

export async function installOutboxTriggers(db: DbClient): Promise<void> {
  await db.execAsync(OUTBOX_TRIGGERS_SQL);
}

/** Run writes without recording them (applying a pull). Call inside a transaction. */
export async function quietly<T>(db: DbClient, work: () => Promise<T>): Promise<T> {
  await db.runAsync('UPDATE sync_flag SET applying = 1 WHERE id = 1', []);
  try {
    return await work();
  } finally {
    await db.runAsync('UPDATE sync_flag SET applying = 0 WHERE id = 1', []);
  }
}

export async function pendingChanges(db: DbClient): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM sync_outbox', []);
  return row?.n ?? 0;
}

export async function lastOutboxSeq(db: DbClient): Promise<number> {
  const row = await db.getFirstAsync<{ s: number | null }>('SELECT MAX(seq) AS s FROM sync_outbox', []);
  return row?.s ?? 0;
}
