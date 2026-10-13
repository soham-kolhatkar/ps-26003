/** @jest-environment node */
import { computeSessionStats } from '@/engine/scoring';

import { initDatabase } from '../init';
import { getLevel, insertSession, listSessions, recentOutcomes, setLevel } from '../repos/games';
import { createTestDb } from '../testing/nodeDb';

const stats = (accuracy: number) =>
  computeSessionStats(
    Array.from({ length: 10 }, (_, i) => ({ correct: i < accuracy * 10, reactionMs: 2000 })),
    3000,
  );

describe('games repo', () => {
  it('defaults to level 1 and upserts levels', async () => {
    const db = createTestDb();
    await initDatabase(db);
    expect(await getLevel(db, 'p-aita', 'word_recall')).toBe(1);
    await setLevel(db, 'p-aita', 'word_recall', 3);
    await setLevel(db, 'p-aita', 'word_recall', 4);
    expect(await getLevel(db, 'p-aita', 'word_recall')).toBe(4);
    expect(await getLevel(db, 'p-lakhi', 'word_recall')).toBe(1);
    db.close();
  });

  it('stores sessions and returns completed outcomes newest first', async () => {
    const db = createTestDb();
    await initDatabase(db);
    const base = { patientId: 'p-aita', gameId: 'word_recall', completed: true };
    await insertSession(db, { ...base, level: 1, startedAt: 1000, endedAt: 2000, stats: stats(0.7) });
    await insertSession(db, { ...base, level: 2, startedAt: 3000, endedAt: 4000, stats: stats(0.9) });
    await insertSession(db, { ...base, level: 2, startedAt: 5000, endedAt: 5500, stats: stats(0.2), completed: false });

    const outcomes = await recentOutcomes(db, 'p-aita', 'word_recall');
    expect(outcomes).toEqual([
      { level: 2, accuracy: 0.9, avgReactionMs: 2000 },
      { level: 1, accuracy: 0.7, avgReactionMs: 2000 },
    ]);

    const all = await listSessions(db, 'p-aita', { gameId: 'word_recall' });
    expect(all).toHaveLength(3);
    expect(all[0]).toMatchObject({ completed: false, level: 2, source: 'app' });
    expect(await listSessions(db, 'p-aita', { gameId: 'word_recall', since: 2500 })).toHaveLength(2);
    db.close();
  });
});
