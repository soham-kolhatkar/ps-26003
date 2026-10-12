import { DatabaseSync } from 'node:sqlite';

import type { DbClient, SqlParams } from '../types';

/** In-memory DbClient backed by Node's built-in SQLite, for jest (node env). */
export function createTestDb(): DbClient & { close: () => void } {
  const db = new DatabaseSync(':memory:');
  const plain = <T>(row: unknown) => (row ? ({ ...(row as object) } as T) : null);

  return {
    async execAsync(source) {
      db.exec(source);
    },
    async runAsync(source, params: SqlParams) {
      const r = db.prepare(source).run(...params);
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    async getAllAsync<T>(source: string, params: SqlParams) {
      return db
        .prepare(source)
        .all(...params)
        .map((row) => plain<T>(row) as T);
    },
    async getFirstAsync<T>(source: string, params: SqlParams) {
      return plain<T>(db.prepare(source).get(...params));
    },
    async withTransactionAsync(task) {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    close: () => db.close(),
  };
}
