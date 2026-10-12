import { useCallback, useEffect, useState } from 'react';

import { getDb } from './client';
import type { DbClient } from './types';

type QueryState<T> = { data: T | undefined; loading: boolean; error: Error | null; reload: () => void };
type Settled<T> = { key: string; data?: T; error: Error | null };

/**
 * Tiny async loader for local SQLite reads. `deps` re-runs the query.
 * Local queries are fast, so there is no caching layer on purpose.
 * Previous data stays visible while a re-run is in flight (no flicker).
 */
export function useDbQuery<T>(query: (db: DbClient) => Promise<T>, deps: readonly unknown[]): QueryState<T> {
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState<Settled<T>>({ key: '', error: null });
  const key = JSON.stringify([...deps, nonce]);

  useEffect(() => {
    let cancelled = false;
    query(getDb()).then(
      (data) => !cancelled && setSettled({ key, data, error: null }),
      (e: unknown) =>
        !cancelled && setSettled((prev) => ({ ...prev, key, error: e instanceof Error ? e : new Error(String(e)) })),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` encodes the caller's deps
  }, [key]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data: settled.data, loading: settled.key !== key, error: settled.error, reload };
}
