/**
 * In-memory stand-in for the Supabase tables (tests only). It applies the same
 * server rules as SQL 003: updated_at from a server clock, decided doses never
 * go back to pending, an older level never overwrites a newer one, game
 * sessions are insert-only, deletes are soft.
 */
import type { PageAfter, RemoteApi } from '../remote';
import type { CloudRow, TableSpec } from '../tables';

export type MemoryRemote = RemoteApi & {
  tables: Map<string, Map<string, CloudRow>>;
  /** Fail the next calls with this error (e.g. offline, access denied). */
  failWith: (e: unknown, times?: number) => void;
  /** Cloud tables that don't exist yet (their SQL file has not been run). */
  missing: Set<string>;
};

const keyOf = (spec: TableSpec, row: Record<string, unknown>) =>
  spec.cloud === 'game_levels' ? `${row.patient_id}|${row.game_id}` : String(row.id);

export function memoryRemote(start = Date.UTC(2026, 9, 14, 8, 0, 0)): MemoryRemote {
  const tables = new Map<string, Map<string, CloudRow>>();
  let clock = start;
  let failure: { e: unknown; times: number } | null = null;
  const stamp = () => new Date((clock += 1000)).toISOString();
  const table = (name: string) => {
    let t = tables.get(name);
    if (!t) tables.set(name, (t = new Map()));
    return t;
  };
  const missing = new Set<string>();
  const maybeFail = (spec?: TableSpec) => {
    if (spec && missing.has(spec.cloud)) {
      throw { code: 'PGRST205', message: `Could not find the table 'public.${spec.cloud}' in the schema cache` };
    }
    if (failure && failure.times > 0) {
      failure.times--;
      throw failure.e;
    }
  };

  return {
    tables,
    missing,
    failWith: (e, times = 1) => {
      failure = { e, times };
    },
    async upsert(spec, rows) {
      maybeFail(spec);
      const t = table(spec.cloud);
      const at = stamp(); // one statement → one server timestamp, like Postgres now()
      for (const row of rows) {
        const k = keyOf(spec, row);
        const old = t.get(k);
        if (old && spec.insertOnly) continue;
        let next: CloudRow = { ...(old ?? {}), ...row, updated_at: at };
        if (old && spec.cloud === 'reminder_events' && old.status !== 'pending' && row.status === 'pending') {
          next = { ...next, status: old.status, acted_at: old.acted_at };
        }
        if (old && spec.cloud === 'game_levels' && Number(row.client_updated_at) < Number(old.client_updated_at)) {
          next = { ...old, updated_at: at };
        }
        t.set(k, next);
      }
    },
    async softDelete(spec, ids) {
      maybeFail(spec);
      const t = table(spec.cloud);
      const at = stamp();
      for (const id of ids) {
        const old = t.get(id);
        if (old) t.set(id, { ...old, deleted_at: at, updated_at: at });
      }
    },
    async pull(spec, since, after: PageAfter | null, limit) {
      maybeFail(spec);
      const ms = (s: string) => new Date(s).getTime();
      const rows = [...table(spec.cloud).values()]
        .filter((r) => {
          if (!after) return ms(r.updated_at) > ms(since);
          const pk = spec.pageKeyOf(r);
          return ms(r.updated_at) > ms(after.updatedAt) || (r.updated_at === after.updatedAt && pk > after.key);
        })
        .sort((a, b) => ms(a.updated_at) - ms(b.updated_at) || spec.pageKeyOf(a).localeCompare(spec.pageKeyOf(b)));
      return rows.slice(0, limit);
    },
  };
}
