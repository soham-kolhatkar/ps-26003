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

const q = (v: string) => `"${v.replace(/"/g, '\\"')}"`;

export const supabaseRemote: RemoteApi = {
  async upsert(spec, rows) {
    if (!rows.length) return;
    const { error } = await supabase()
      .from(spec.cloud)
      .upsert(rows, { onConflict: spec.onConflict, ignoreDuplicates: spec.insertOnly === true });
    if (error) throw error;
  },
  async softDelete(spec, ids) {
    if (!ids.length) return;
    const { error } = await supabase().from(spec.cloud).update({ deleted_at: new Date().toISOString() }).in('id', ids);
    if (error) throw error;
  },
  async pull(spec, since, after, limit) {
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
    if (error) throw error;
    return (data ?? []) as CloudRow[];
  },
};
