import { installOutboxTriggers } from '@/sync/outbox';

import { migrate } from './migrations';
import { backfillDemoGames, backfillDemoReminders, backfillDemoVisits, isSeeded, seedDemo } from './seed/demo';
import type { DbClient } from './types';

/**
 * Runs on every app start (SQLiteProvider onInit) before any screen renders:
 * connection pragmas → migrations → demo seed on first launch.
 */
export async function initDatabase(db: DbClient): Promise<{ version: number; seeded: boolean }> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const version = await migrate(db);
  let seeded = false;
  if (!(await isSeeded(db))) {
    await seedDemo(db);
    seeded = true;
  } else {
    await backfillDemoReminders(db);
    await backfillDemoGames(db);
    await backfillDemoVisits(db);
  }
  return { version, seeded };
}

/** Cloud and setup databases: same schema, never the demo story (data comes from sync). */
export async function initCloudDatabase(db: DbClient): Promise<{ version: number }> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const version = await migrate(db);
  // Change tracking for sync: only cloud databases record their writes (F17).
  await installOutboxTriggers(db);
  return { version };
}
