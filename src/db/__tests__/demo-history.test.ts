/** @jest-environment node */
import { gameSummary } from '@/engine/progress';

import { initDatabase } from '../init';
import { MIGRATIONS } from '../migrations';
import { getLevel, listSessions } from '../repos/games';
import { createTestDb } from '../testing/nodeDb';

const DAY = 24 * 3600e3;

async function points(db: ReturnType<typeof createTestDb>, patientId: string) {
  return (await listSessions(db, patientId, { limit: 1000 })).map((s) => ({
    gameId: s.gameId,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    level: s.level,
    score: s.stats.score,
    completed: s.completed,
  }));
}

describe('demo game history', () => {
  it('gives Kamala a month of play across three games, all before today', async () => {
    const db = createTestDb();
    await initDatabase(db);
    const rows = await points(db, 'p-aita');
    expect(new Set(rows.map((r) => r.gameId))).toEqual(
      new Set(['memory_match', 'routine_sequence', 'object_recognition']),
    );
    expect(rows.length).toBeGreaterThan(40);
    const todayStart = new Date().setHours(0, 0, 0, 0);
    expect(rows.every((r) => r.startedAt < todayStart && r.startedAt > todayStart - 31 * DAY)).toBe(true);
    // The adaptive engine moved her up in at least one game.
    const levels = await Promise.all(
      ['memory_match', 'routine_sequence', 'object_recognition'].map((g) => getLevel(db, 'p-aita', g)),
    );
    expect(Math.max(...levels)).toBeGreaterThan(1);
    db.close();
  });

  it("shows Ramesh's gradual decline", async () => {
    const db = createTestDb();
    await initDatabase(db);
    const rows = await points(db, 'p-dhaniram');
    const s = gameSummary(rows, 'object_recognition', 15, Date.now()); // two halves of the 30-day history
    expect(s.delta).not.toBeNull();
    expect(s.delta!).toBeLessThan(0);
    db.close();
  });

  it('backfills once for installs that predate it, keeping existing levels', async () => {
    const db = createTestDb();
    for (const m of MIGRATIONS) {
      await db.execAsync(m.sql);
      await db.execAsync(`PRAGMA user_version = ${m.version}`);
    }
    await db.execAsync(
      "INSERT INTO household (id, name, created_at) VALUES ('h-bora', 'Sharma family', 0);" +
        "INSERT INTO patient (id, household_id, name, language, created_at, updated_at) VALUES ('p-aita', 'h-bora', 'Kamala Sharma', 'hi', 0, 0);" +
        "INSERT INTO game_level (patient_id, game_id, level, updated_at) VALUES ('p-aita', 'memory_match', 4, 0);",
    );
    await initDatabase(db);
    const first = (await points(db, 'p-aita')).length;
    expect(first).toBeGreaterThan(40);
    expect(await getLevel(db, 'p-aita', 'memory_match')).toBe(4);
    await initDatabase(db);
    expect((await points(db, 'p-aita')).length).toBe(first);
    db.close();
  });
});
