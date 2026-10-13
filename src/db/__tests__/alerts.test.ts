/** @jest-environment node */
import type { DetectedAlert } from '@/engine/trends';
import { refreshAlerts } from '@/services/alerts';

import { initDatabase } from '../init';
import { alertCounts, listAlerts, markAlertsSeen, syncAlerts } from '../repos/alerts';
import { resetDemo } from '../seed/demo';
import { createTestDb } from '../testing/nodeDb';

const decline = (severity: DetectedAlert['severity'], dropPct = 20): DetectedAlert => ({
  kind: 'game_decline',
  key: 'game_decline:memory_match',
  severity,
  detail: {
    gameId: 'memory_match',
    baselineIndex: 50,
    recentIndex: 40,
    dropPct,
    baselineLevel: 3,
    recentLevel: 2,
    baselineSessions: 6,
    recentSessions: 3,
  },
});
const adherence: DetectedAlert = {
  kind: 'adherence_low',
  key: 'adherence_low',
  severity: 'warning',
  detail: { taken: 3, decided: 6, ratePct: 50, days: 7 },
};

describe('alerts repo', () => {
  it('inserts, updates, re-opens on escalation and resolves', async () => {
    const db = createTestDb();
    await initDatabase(db);
    await syncAlerts(db, 'p-aita', [decline('warning'), adherence], 1000);
    expect(await alertCounts(db, 'p-aita')).toEqual({ open: 2, unseen: 2, serious: 0 });

    await markAlertsSeen(db, 'p-aita', 1500);
    expect((await alertCounts(db, 'p-aita')).unseen).toBe(0);

    // Same alerts again, slightly different numbers: stays seen, keeps its id.
    const [before] = await listAlerts(db, 'p-aita');
    await syncAlerts(db, 'p-aita', [decline('warning', 22), adherence], 2000);
    const again = await listAlerts(db, 'p-aita');
    expect(again.find((a) => a.kind === 'game_decline')).toMatchObject({ id: before.id, seenAt: 1500 });
    expect(again.find((a) => a.kind === 'game_decline')?.detail.dropPct).toBe(22);

    // Gets more serious: unseen again, listed first.
    await syncAlerts(db, 'p-aita', [decline('serious', 30), adherence], 3000);
    const escalated = await listAlerts(db, 'p-aita');
    expect(escalated[0]).toMatchObject({
      kind: 'game_decline',
      severity: 'serious',
      seenAt: null,
      gameId: 'memory_match',
    });

    // Adherence recovered: resolved, hidden unless asked for.
    await syncAlerts(db, 'p-aita', [decline('serious', 30)], 4000);
    expect((await listAlerts(db, 'p-aita')).map((a) => a.kind)).toEqual(['game_decline']);
    const withResolved = await listAlerts(db, 'p-aita', { resolvedSince: 0 });
    expect(withResolved.map((a) => [a.kind, a.resolvedAt])).toEqual([
      ['game_decline', null],
      ['adherence_low', 4000],
    ]);

    // Comes back later: a new open alert, the old one stays resolved.
    await syncAlerts(db, 'p-aita', [decline('serious', 30), adherence], 5000);
    expect((await alertCounts(db, 'p-aita')).open).toBe(2);
    expect(await listAlerts(db, 'p-aita', { resolvedSince: 0 })).toHaveLength(3);
    db.close();
  });

  it('demo story: Dhaniram is flagged (two games + medicine), Aita and Lakhi are not', async () => {
    const db = createTestDb();
    await initDatabase(db);
    const now = Date.now();
    for (const p of ['p-aita', 'p-lakhi', 'p-dhaniram']) await refreshAlerts(db, p, now);
    expect(await listAlerts(db, 'p-aita')).toEqual([]);
    expect(await listAlerts(db, 'p-lakhi')).toEqual([]);
    const d = await listAlerts(db, 'p-dhaniram');
    expect(d.map((a) => a.key).sort()).toEqual([
      'adherence_low',
      'game_decline:object_recognition',
      'game_decline:routine_sequence',
    ]);
    // Running it again changes nothing.
    await refreshAlerts(db, 'p-dhaniram', now);
    expect(await listAlerts(db, 'p-dhaniram', { resolvedSince: 0 })).toHaveLength(3);

    await resetDemo(db, now);
    expect(await listAlerts(db, 'p-dhaniram', { resolvedSince: 0 })).toEqual([]);
    db.close();
  });
});

describe('refreshAlerts', () => {
  it('survives concurrent refreshes of the same patient (screen mount + focus)', async () => {
    const db = createTestDb();
    await initDatabase(db);
    const now = Date.now();
    await Promise.all([refreshAlerts(db, 'p-dhaniram', now), refreshAlerts(db, 'p-dhaniram', now)]);
    expect(await listAlerts(db, 'p-dhaniram', { resolvedSince: 0 })).toHaveLength(3);
    db.close();
  });

  it('never throws, even when the database fails', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const broken = { getAllAsync: () => Promise.reject(new Error('boom')) } as never;
    await expect(refreshAlerts(broken, 'p-aita')).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
