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

/**
 * Which SQLite file to open (D42). The demo keeps today's seeded file; each
 * cloud account gets its own file, so one person never sees another's data on
 * a shared phone; before sign-in an empty setup file is used.
 */
export function databaseNameFor(mode: 'demo' | 'cloud' | null, uid: string | null): string {
  if (mode === 'demo') return DATABASE_NAME;
  if (mode === 'cloud' && uid) return `smriti-cloud-${uid}.db`;
  return 'smriti-setup.db';
}
