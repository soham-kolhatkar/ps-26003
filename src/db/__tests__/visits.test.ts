/** @jest-environment node */
import { visitStatus } from '@/engine/visits';

import { initDatabase } from '../init';
import { MIGRATIONS } from '../migrations';
import { insertVisit, lastVisit, listVisits } from '../repos/visits';
import { createTestDb } from '../testing/nodeDb';

describe('visits', () => {
  it('stores and reads a visit with check-up and observations', async () => {
    const db = createTestDb();
    await initDatabase(db);
    const id = await insertVisit(db, {
      patientId: 'p-lakhi',
      userId: 'u-pranita',
      startedAt: Date.now(),
      endedAt: Date.now() + 60000,
      checkup: [{ gameId: 'orientation', level: 1, score: 67, trials: 3, correct: 2, avgReactionMs: 3000 }],
      checkupScore: 67,
      observations: { sleep: 'poor', falls: 'no' },
      note: '  Needs new glasses  ',
      refer: true,
      nextVisitAt: null,
    });
    const v = await lastVisit(db, 'p-lakhi');
    expect(v).toMatchObject({
      id,
      checkupScore: 67,
      observations: { sleep: 'poor', falls: 'no' },
      note: 'Needs new glasses',
      refer: true,
    });
    expect(v?.checkup?.[0].gameId).toBe('orientation');
    db.close();
  });

  it("demo: Dhaniram's check-ups slip and his visit is overdue; Aita and Lakhi are on schedule", async () => {
    const db = createTestDb();
    await initDatabase(db);
    const now = Date.now();
    const d = await listVisits(db, 'p-dhaniram');
    expect(d).toHaveLength(3);
    const scores = d.map((v) => v.checkupScore!).reverse(); // oldest first
    expect(scores[0]).toBeGreaterThan(scores[1]);
    expect(scores[1]).toBeGreaterThan(scores[2]);
    expect(visitStatus(d[0], now)).toMatchObject({ state: 'overdue', days: 2 });
    expect(visitStatus(await lastVisit(db, 'p-aita'), now)).toMatchObject({ state: 'ok', days: 4 });
    expect(visitStatus(await lastVisit(db, 'p-lakhi'), now)).toMatchObject({ state: 'ok', days: 9 });
    db.close();
  });

  it('backfills demo visits once on older installs', async () => {
    const db = createTestDb();
    await initDatabase(db);
    await db.execAsync("DELETE FROM visit; DELETE FROM setting WHERE key = 'demo_visits_seeded';");
    await initDatabase(db);
    await initDatabase(db);
    expect(await listVisits(db, 'p-dhaniram')).toHaveLength(3);
    expect(MIGRATIONS.at(-1)?.version).toBe(5);
    db.close();
  });
});
