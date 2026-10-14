/**
 * How each synced table maps between the phone (SQLite) and the cloud
 * (Postgres): column names and types, keys, and what applying a pulled row
 * means locally. Pure apart from the DbClient calls (tested with node SQLite).
 */
import type { DbClient, SqlParams, SqlValue } from '@/db/types';

import type { SyncedTable } from './outbox';

export type CloudRow = Record<string, unknown> & { updated_at: string };
type LocalRow = Record<string, unknown>;

export type TableSpec = {
  local: SyncedTable;
  cloud: 'reminders' | 'reminder_events' | 'game_sessions' | 'game_levels' | 'visits';
  /** Outbox row_id for a local row. */
  key: (row: LocalRow) => string;
  /** Cloud column used to page rows that share one updated_at. */
  pageKey: string;
  pageKeyOf: (row: CloudRow) => string;
  onConflict: string;
  /** Rows are never changed after insert (game sessions). */
  insertOnly?: boolean;
  readLocal: (db: DbClient, keys: string[]) => Promise<LocalRow[]>;
  toCloud: (row: LocalRow) => Record<string, unknown>;
};

const bool = (v: unknown) => v === 1 || v === true;
const int = (v: unknown) => (v ? 1 : 0);
/** Cloud values → SQLite parameters (undefined → null). */
const params = (...vals: unknown[]): SqlParams => vals.map((v) => (v === undefined ? null : (v as SqlValue)));
const placeholders = (n: number) => Array.from({ length: n }, () => '?').join(', ');

async function byId(db: DbClient, table: string, ids: string[]): Promise<LocalRow[]> {
  if (!ids.length) return [];
  return db.getAllAsync<LocalRow>(`SELECT * FROM ${table} WHERE id IN (${placeholders(ids.length)})`, ids);
}

export const SPECS: Record<SyncedTable, TableSpec> = {
  reminder: {
    local: 'reminder',
    cloud: 'reminders',
    key: (r) => String(r.id),
    pageKey: 'id',
    pageKeyOf: (r) => String(r.id),
    onConflict: 'id',
    readLocal: (db, ids) => byId(db, 'reminder', ids),
    toCloud: (r) => ({
      id: r.id,
      patient_id: r.patient_id,
      type: r.type,
      title: r.title,
      note: r.note,
      schedule_kind: r.schedule_kind,
      times: r.times,
      once_at: r.once_at,
      enabled: bool(r.enabled),
      created_by: r.created_by,
      created_at: r.created_at,
      client_updated_at: r.updated_at,
      deleted_at: null,
    }),
  },
  reminder_event: {
    local: 'reminder_event',
    cloud: 'reminder_events',
    key: (r) => String(r.id),
    pageKey: 'id',
    pageKeyOf: (r) => String(r.id),
    onConflict: 'id',
    readLocal: (db, ids) => byId(db, 'reminder_event', ids),
    toCloud: (r) => ({
      id: r.id,
      reminder_id: r.reminder_id,
      patient_id: r.patient_id,
      due_at: r.due_at,
      status: r.status,
      acted_at: r.acted_at,
    }),
  },
  game_session: {
    local: 'game_session',
    cloud: 'game_sessions',
    key: (r) => String(r.id),
    pageKey: 'id',
    pageKeyOf: (r) => String(r.id),
    onConflict: 'id',
    insertOnly: true,
    readLocal: (db, ids) => byId(db, 'game_session', ids),
    toCloud: (r) => ({
      id: r.id,
      patient_id: r.patient_id,
      game_id: r.game_id,
      level: r.level,
      started_at: r.started_at,
      ended_at: r.ended_at,
      trials: r.trials,
      correct: r.correct,
      accuracy: r.accuracy,
      avg_reaction_ms: r.avg_reaction_ms,
      score: r.score,
      completed: bool(r.completed),
      source: r.source,
    }),
  },
  game_level: {
    local: 'game_level',
    cloud: 'game_levels',
    key: (r) => `${r.patient_id}|${r.game_id}`,
    pageKey: 'game_id',
    pageKeyOf: (r) => String(r.game_id),
    onConflict: 'patient_id,game_id',
    readLocal: async (db, keys) => {
      const out: LocalRow[] = [];
      for (const k of keys) {
        const [patientId, gameId] = k.split('|');
        const row = await db.getFirstAsync<LocalRow>('SELECT * FROM game_level WHERE patient_id = ? AND game_id = ?', [
          patientId,
          gameId,
        ]);
        if (row) out.push(row);
      }
      return out;
    },
    toCloud: (r) => ({
      patient_id: r.patient_id,
      game_id: r.game_id,
      level: r.level,
      client_updated_at: r.updated_at,
    }),
  },
  visit: {
    local: 'visit',
    cloud: 'visits',
    key: (r) => String(r.id),
    pageKey: 'id',
    pageKeyOf: (r) => String(r.id),
    onConflict: 'id',
    readLocal: (db, ids) => byId(db, 'visit', ids),
    toCloud: (r) => ({
      id: r.id,
      patient_id: r.patient_id,
      user_id: r.user_id,
      started_at: r.started_at,
      ended_at: r.ended_at,
      checkup: r.checkup ? JSON.parse(String(r.checkup)) : null,
      checkup_score: r.checkup_score,
      observations: JSON.parse(String(r.observations || '{}')),
      note: r.note,
      refer: bool(r.refer),
      next_visit_at: r.next_visit_at,
      source: r.source,
    }),
  },
};

// ─── Applying pulled rows locally ─────────────────────────────────────────

export type ApplyContext = {
  now: number;
  /** Rows still waiting in this phone's outbox: the local edit is newer, keep it. */
  unpushed: Set<string>;
  knownUsers: Set<string>;
  knownPatients: Set<string>;
};

export type ApplyOutcome = {
  applied: number;
  /** Rows that could not be applied yet (their parent is missing): pull them again later. */
  held: CloudRow[];
  remindersChanged: boolean;
};

const userOrNull = (ctx: ApplyContext, id: unknown) => (typeof id === 'string' && ctx.knownUsers.has(id) ? id : null);

/** Apply one page of cloud rows to the local table. Call inside a transaction, quietly. */
export async function applyRows(
  db: DbClient,
  spec: TableSpec,
  rows: CloudRow[],
  ctx: ApplyContext,
): Promise<ApplyOutcome> {
  const out: ApplyOutcome = { applied: 0, held: [], remindersChanged: false };
  for (const r of rows) {
    const pid = String(r.patient_id);
    if (!ctx.knownPatients.has(pid)) {
      out.held.push(r);
      continue;
    }
    const localKey = spec.local === 'game_level' ? `${r.patient_id}|${r.game_id}` : String(r.id);
    if (ctx.unpushed.has(`${spec.local}:${localKey}`)) continue;

    switch (spec.local) {
      case 'reminder': {
        out.remindersChanged = true;
        if (r.deleted_at) {
          await db.runAsync('DELETE FROM reminder WHERE id = ?', params(r.id));
          break;
        }
        const existed = await db.getFirstAsync('SELECT 1 AS x FROM reminder WHERE id = ?', params(r.id));
        await db.runAsync(
          `INSERT INTO reminder (id, patient_id, type, title, note, schedule_kind, times, once_at, enabled, created_by,
             created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET type = excluded.type, title = excluded.title, note = excluded.note,
             schedule_kind = excluded.schedule_kind, times = excluded.times, once_at = excluded.once_at,
             enabled = excluded.enabled, updated_at = excluded.updated_at`,
          params(
            r.id,
            pid,
            r.type,
            r.title,
            r.note,
            r.schedule_kind,
            r.times,
            r.once_at,
            int(r.enabled),
            userOrNull(ctx, r.created_by),
            r.created_at,
            r.client_updated_at,
          ),
        );
        // Changed elsewhere: future pending doses may no longer match (as saveReminder does locally).
        if (existed) {
          await db.runAsync(
            "DELETE FROM reminder_event WHERE reminder_id = ? AND status = 'pending' AND due_at > ?",
            params(r.id, ctx.now),
          );
        }
        break;
      }
      case 'reminder_event': {
        const parent = await db.getFirstAsync('SELECT 1 AS x FROM reminder WHERE id = ?', [r.reminder_id as string]);
        if (!parent) {
          out.held.push(r);
          continue;
        }
        // Same dose, maybe under an older random id on this phone: one row per reminder + due time.
        await db.runAsync('DELETE FROM reminder_event WHERE reminder_id = ? AND due_at = ? AND id <> ?', [
          r.reminder_id as string,
          r.due_at as number,
          r.id as string,
        ]);
        await db.runAsync(
          `INSERT INTO reminder_event (id, reminder_id, patient_id, due_at, status, acted_at) VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             status = CASE WHEN reminder_event.status <> 'pending' AND excluded.status = 'pending'
                           THEN reminder_event.status ELSE excluded.status END,
             acted_at = CASE WHEN reminder_event.status <> 'pending' AND excluded.status = 'pending'
                             THEN reminder_event.acted_at ELSE excluded.acted_at END`,
          params(r.id, r.reminder_id, pid, r.due_at, r.status, r.acted_at),
        );
        break;
      }
      case 'game_session':
        await db.runAsync(
          `INSERT OR IGNORE INTO game_session (id, patient_id, game_id, level, started_at, ended_at, trials, correct,
             accuracy, avg_reaction_ms, score, completed, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          params(
            r.id,
            pid,
            r.game_id,
            r.level,
            r.started_at,
            r.ended_at,
            r.trials,
            r.correct,
            r.accuracy,
            r.avg_reaction_ms,
            r.score,
            int(r.completed),
            r.source ?? 'app',
          ),
        );
        break;
      case 'game_level':
        await db.runAsync(
          `INSERT INTO game_level (patient_id, game_id, level, updated_at) VALUES (?, ?, ?, ?)
           ON CONFLICT(patient_id, game_id) DO UPDATE SET level = excluded.level, updated_at = excluded.updated_at
           WHERE excluded.updated_at >= game_level.updated_at`,
          params(pid, r.game_id, r.level, r.client_updated_at),
        );
        break;
      case 'visit':
        await db.runAsync(
          `INSERT INTO visit (id, patient_id, user_id, started_at, ended_at, checkup, checkup_score, observations, note,
             refer, next_visit_at, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET ended_at = excluded.ended_at, checkup = excluded.checkup,
             checkup_score = excluded.checkup_score, observations = excluded.observations, note = excluded.note,
             refer = excluded.refer, next_visit_at = excluded.next_visit_at`,
          params(
            r.id,
            pid,
            userOrNull(ctx, r.user_id),
            r.started_at,
            r.ended_at,
            r.checkup == null ? null : JSON.stringify(r.checkup),
            r.checkup_score,
            JSON.stringify(r.observations ?? {}),
            r.note,
            int(r.refer),
            r.next_visit_at,
            r.source ?? 'app',
          ),
        );
        break;
    }
    out.applied++;
  }
  return out;
}
