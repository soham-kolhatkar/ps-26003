/**
 * The cloud as the sync engine sees it. One implementation talks to Supabase;
 * tests use an in-memory fake (testing/memoryRemote.ts) that also simulates
 * the server rules (decided doses stay decided, newer levels win).
 */
import { supabase } from '@/cloud/client';

import type { CloudRow, TableSpec } from './tables';

export type PageAfter = { updatedAt: string; key: string };

export interface RemoteApi {
  upsert(spec: TableSpec, rows: Record<string, unknown>[]): Promise<void>;
  /** Soft delete (the row keeps existing so other phones learn about it). */
  softDelete(spec: TableSpec, ids: string[]): Promise<void>;
  /** Rows changed after `since` (exclusive), oldest first; `after` continues a page within one timestamp. */
  pull(spec: TableSpec, since: string, after: PageAfter | null, limit: number): Promise<CloudRow[]>;
}

/** An error that will never succeed by retrying (access rules, bad data): drop the change. */
export function isPermanent(e: unknown): boolean {
  const err = (e ?? {}) as { code?: string; message?: string; status?: number };
  const msg = err.message ?? '';
  return (
    err.code === '42501' ||
    err.code === '23503' ||
    err.code === '23514' ||
    err.code === '22P02' ||
    /row-level security|violates|permission denied/i.test(msg)
  );
}

/**
 * The cloud doesn't have this table yet (a newer app before its SQL file was run, e.g.
 * SQL 006 for SOS). Skip it and keep its changes queued; the rest of sync carries on.
 */
export function isMissingTable(e: unknown): boolean {
  const err = (e ?? {}) as { code?: string; message?: string };
  return (
    err.code === 'PGRST205' ||
    err.code === '42P01' ||
    /could not find the table|does not exist/i.test(err.message ?? '')
  );
}

/** A table found missing is not asked for again for a while (one 404, not one per sync). */
const RECHECK_MISSING_MS = 10 * 60_000;
const missingUntil = new Map<string, number>();

function skipIfMissing(spec: TableSpec): void {
  const until = missingUntil.get(spec.cloud);
  if (until != null && Date.now() < until) {
    throw { code: 'PGRST205', message: `Could not find the table 'public.${spec.cloud}' (checked recently)` };
  }
}

function check(spec: TableSpec, error: unknown): void {
  if (!error) return;
  if (isMissingTable(error)) missingUntil.set(spec.cloud, Date.now() + RECHECK_MISSING_MS);
  throw error;
}

const q = (v: string) => `"${v.replace(/"/g, '\\"')}"`;

export const supabaseRemote: RemoteApi = {
  async upsert(spec, rows) {
    if (!rows.length) return;
    skipIfMissing(spec);
    const { error } = await supabase()
      .from(spec.cloud)
      .upsert(rows, { onConflict: spec.onConflict, ignoreDuplicates: spec.insertOnly === true });
    check(spec, error);
  },
  async softDelete(spec, ids) {
    if (!ids.length) return;
    const { error } = await supabase().from(spec.cloud).update({ deleted_at: new Date().toISOString() }).in('id', ids);
    if (error) throw error;
  },
  async pull(spec, since, after, limit) {
    skipIfMissing(spec);
    let query = supabase().from(spec.cloud).select('*');
    query = after
      ? query.or(
          `updated_at.gt.${q(after.updatedAt)},and(updated_at.eq.${q(after.updatedAt)},${spec.pageKey}.gt.${q(after.key)})`,
        )
      : query.gt('updated_at', since);
    const { data, error } = await query
      .order('updated_at', { ascending: true })
      .order(spec.pageKey, { ascending: true })
      .limit(limit);
    check(spec, error);
    return (data ?? []) as CloudRow[];
  },
};
