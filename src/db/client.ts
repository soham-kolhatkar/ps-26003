import type { DbClient } from './types';

/**
 * Process-wide handle to the open database, set once by the root
 * SQLiteProvider's onInit. Stores and services use getDb(); repos take the
 * client as an argument so they stay testable.
 */
let current: DbClient | null = null;

export function setDb(db: DbClient): void {
  current = db;
}

export function getDb(): DbClient {
  if (!current) throw new Error('Database not initialised — getDb() called before SQLiteProvider onInit');
  return current;
}

export const DATABASE_NAME = 'smriti.db';
