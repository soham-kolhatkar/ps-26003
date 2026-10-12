/** @jest-environment node */
import { initDatabase } from '@/db/init';
import { getLevel, listSessions } from '@/db/repos/games';
import { createTestDb } from '@/db/testing/nodeDb';
import type { Trial } from '@/engine/scoring';

import { finishSession } from '../session';

const game = { id: 'object_recognition' as const, maxLevel: 5, targetReactionMs: 4000 };
const trials = (correct: number, total = 6): Trial[] =>
  Array.from({ length: total }, (_, i) => ({ correct: i < correct, reactionMs: 2000 }));

describe('finishSession', () => {
  it('levels up after two strong completed sessions, and records everything', async () => {
    const db = createTestDb();
    await initDatabase(db);
    const base = { game, patientId: 'p-aita', level: 1, completed: true };

    const first = await finishSession(db, { ...base, startedAt: 1000, now: 2000, trials: trials(6) });
    expect(first.decision).toMatchObject({ change: 'hold', reason: 'warmup' });
    expect(await getLevel(db, 'p-aita', game.id)).toBe(1);

    const second = await finishSession(db, { ...base, startedAt: 3000, now: 4000, trials: trials(6) });
    expect(second.stats.accuracy).toBe(1);
    expect(second.decision).toMatchObject({ level: 2, change: 'up' });
    expect(await getLevel(db, 'p-aita', game.id)).toBe(2);

    expect(await listSessions(db, 'p-aita')).toHaveLength(2);
    db.close();
  });

  it('saves stopped sessions without touching the level', async () => {
    const db = createTestDb();
    await initDatabase(db);
    const result = await finishSession(db, {
      game,
      patientId: 'p-aita',
      level: 1,
      startedAt: 1000,
      now: 1500,
      trials: trials(0, 2),
      completed: false,
    });
    expect(result.decision).toBeNull();
    expect(await getLevel(db, 'p-aita', game.id)).toBe(1);
    expect((await listSessions(db, 'p-aita'))[0]).toMatchObject({ completed: false });
    db.close();
  });

  it('rescues to an easier level after a rough session', async () => {
    const db = createTestDb();
    await initDatabase(db);
    const result = await finishSession(db, {
      game,
      patientId: 'p-aita',
      level: 3,
      startedAt: 1000,
      now: 2000,
      trials: trials(2),
      completed: true,
    });
    expect(result.decision).toMatchObject({ level: 2, change: 'down', reason: 'rescue' });
    db.close();
  });
});
