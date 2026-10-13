import { getSchemaVersion, migrate } from './migrations';
import { backfillDemoReminders, isSeeded, seedDemo } from './seed/demo';
import type { DbClient } from './types';

/**
 * Runs on every app start (SQLiteProvider onInit) before any screen renders:
 * connection pragmas → migrations → demo seed on first launch.
 */
export async function initDatabase(db: DbClient): Promise<{ version: number; seeded: boolean }> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const before = await getSchemaVersion(db);
  const version = await migrate(db);
  let seeded = false;
  if (!(await isSeeded(db))) {
    await seedDemo(db);
    seeded = true;
  } else if (before > 0 && before < 3) {
    await backfillDemoReminders(db);
  }
  return { version, seeded };
}
