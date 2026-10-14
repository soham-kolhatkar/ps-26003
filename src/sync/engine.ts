/**
 * Push, then pull (D42). One run at a time (people refresh included), so
 * local transactions never overlap.
 *
 * Push: outbox entries in order; the newest op per row wins; rows are read
 * fresh from the local table; entries are deleted only up to the last `seq`
 * that was pushed (a change made meanwhile stays queued). Errors that can never
 * succeed (access rules) drop the entry; network errors keep it.
 *
 * Pull: per table, rows changed since the cursor minus 5 s, paged by
 * (updated_at, key). Rows still in the outbox are skipped (the local edit is
 * newer). Rows whose parent isn't here yet are held: the cursor stops before
 * them. Each page is applied in one quiet transaction.
 */
import type { DbClient } from '@/db/types';

import { quietly, SYNCED_TABLES, type SyncedTable } from './outbox';
import { isPermanent, type PageAfter, type RemoteApi } from './remote';
import { applyRows, SPECS, type CloudRow } from './tables';

const PUSH_BATCH = 500;
export const PULL_PAGE = 1000;
const OVERLAP_MS = 5000;
const EPOCH = '1970-01-01T00:00:00Z';

let queue: Promise<unknown> = Promise.resolve();

/** Serialise all sync work (and people refreshes) on this phone. */
export function exclusive<T>(work: () => Promise<T>): Promise<T> {
  const run = queue.then(work);
  queue = run.catch(() => undefined);
  return run;
}

export type PushResult = { pushed: number; dropped: number };

export async function push(db: DbClient, remote: RemoteApi): Promise<PushResult> {
  const entries = await db.getAllAsync<{ seq: number; tbl: SyncedTable; row_id: string; op: 'upsert' | 'delete' }>(
    'SELECT seq, tbl, row_id, op FROM sync_outbox ORDER BY seq LIMIT ?',
    [PUSH_BATCH],
  );
  if (!entries.length) return { pushed: 0, dropped: 0 };
  const maxSeq = entries[entries.length - 1].seq;

  // Newest op per row.
  const latest = new Map<string, { tbl: SyncedTable; rowId: string; op: 'upsert' | 'delete' }>();
  for (const e of entries) latest.set(`${e.tbl}:${e.row_id}`, { tbl: e.tbl, rowId: e.row_id, op: e.op });

  let pushed = 0;
  let dropped = 0;
  for (const tbl of SYNCED_TABLES) {
    const spec = SPECS[tbl];
    const mine = [...latest.values()].filter((x) => x.tbl === tbl);
    const upserts = mine.filter((x) => x.op === 'upsert').map((x) => x.rowId);
    const deletes = mine.filter((x) => x.op === 'delete').map((x) => x.rowId);
    try {
      const rows = await spec.readLocal(db, upserts);
      await remote.upsert(spec, rows.map(spec.toCloud));
      pushed += rows.length;
      // Only reminders are deleted by people; other rows disappear with them.
      if (tbl === 'reminder' && deletes.length) {
        await remote.softDelete(spec, deletes);
        pushed += deletes.length;
      }
    } catch (e) {
      if (!isPermanent(e)) throw e;
      console.warn(`Sync: dropped ${mine.length} ${tbl} change(s) the cloud refused`, e);
      dropped += mine.length;
    }
  }
  await db.runAsync('DELETE FROM sync_outbox WHERE seq <= ?', [maxSeq]);
  return { pushed, dropped };
}

async function getCursor(db: DbClient, tbl: SyncedTable): Promise<string> {
  const row = await db.getFirstAsync<{ updated: string }>('SELECT updated FROM sync_cursor WHERE tbl = ?', [tbl]);
  return row?.updated ?? EPOCH;
}

async function setCursor(db: DbClient, tbl: SyncedTable, updated: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO sync_cursor (tbl, updated) VALUES (?, ?) ON CONFLICT(tbl) DO UPDATE SET updated = excluded.updated',
    [tbl, updated],
  );
}

/** Forget pull positions: the next pull fetches everything this account can see (new patient joined). */
export async function resetCursors(db: DbClient): Promise<void> {
  await db.runAsync('DELETE FROM sync_cursor', []);
}

const ms = (iso: string) => new Date(iso).getTime();
const minus = (iso: string, d: number) => new Date(Math.max(0, ms(iso) - d)).toISOString();

export type PullResult = { applied: number; held: number; remindersChanged: boolean; changed: boolean };

export async function pull(db: DbClient, remote: RemoteApi, now = Date.now()): Promise<PullResult> {
  const result: PullResult = { applied: 0, held: 0, remindersChanged: false, changed: false };
  const knownPatients = new Set((await db.getAllAsync<{ id: string }>('SELECT id FROM patient', [])).map((r) => r.id));
  const knownUsers = new Set((await db.getAllAsync<{ id: string }>('SELECT id FROM app_user', [])).map((r) => r.id));

  for (const tbl of SYNCED_TABLES) {
    const spec = SPECS[tbl];
    const cursor = await getCursor(db, tbl);
    const since = cursor === EPOCH ? EPOCH : minus(cursor, OVERLAP_MS);
    let after: PageAfter | null = null;
    let newest = cursor;
    let heldFrom: string | null = null;

    for (;;) {
      const rows: CloudRow[] = await remote.pull(spec, since, after, PULL_PAGE);
      if (!rows.length) break;
      const unpushed = new Set(
        (
          await db.getAllAsync<{ k: string }>("SELECT tbl || ':' || row_id AS k FROM sync_outbox WHERE tbl = ?", [tbl])
        ).map((r) => r.k),
      );
      let outcome = { applied: 0, held: [] as CloudRow[], remindersChanged: false };
      await db.withTransactionAsync(async () => {
        await db.execAsync('PRAGMA defer_foreign_keys = ON');
        outcome = await quietly(db, () => applyRows(db, spec, rows, { now, unpushed, knownUsers, knownPatients }));
      });
      result.applied += outcome.applied;
      result.held += outcome.held.length;
      result.remindersChanged ||= outcome.remindersChanged;
      for (const h of outcome.held) if (!heldFrom || ms(h.updated_at) < ms(heldFrom)) heldFrom = h.updated_at;
      const last = rows[rows.length - 1];
      if (ms(last.updated_at) > ms(newest)) newest = last.updated_at;
      if (rows.length < PULL_PAGE) break;
      after = { updatedAt: last.updated_at, key: spec.pageKeyOf(last) };
    }
    // Held rows must come again: stop the cursor just before the first of them.
    const next = heldFrom && ms(heldFrom) <= ms(newest) ? minus(heldFrom, 1) : newest;
    if (next !== cursor) await setCursor(db, tbl, next);
  }
  result.changed = result.applied > 0;
  return result;
}
