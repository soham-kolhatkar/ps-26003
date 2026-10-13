/** @jest-environment node */
import { adherence, startOfDay } from '@/engine/reminders';

import { initDatabase } from '../init';
import { MIGRATIONS } from '../migrations';
import {
  deleteReminder,
  ensureEvents,
  getReminder,
  listOccurrences,
  listReminders,
  markOccurrence,
  occurrenceFor,
  saveReminder,
} from '../repos/reminders';
import { DEMO } from '../seed/demo';
import { createTestDb } from '../testing/nodeDb';

const DAY = 24 * 3600e3;

async function freshDb() {
  const db = createTestDb();
  await initDatabase(db);
  return db;
}

describe('reminders repo', () => {
  it('a fresh seed is not backfilled again on the next launch', async () => {
    const db = await freshDb();
    await initDatabase(db);
    expect(await listReminders(db, 'p-aita')).toHaveLength(4);
    db.close();
  });

  it('seeds demo reminders with ~85% history adherence for Aita', async () => {
    const db = await freshDb();
    const aita = await listReminders(db, 'p-aita');
    expect(aita.map((r) => r.type)).toEqual(['medicine', 'hydration', 'activity', 'appointment']);
    expect(aita.find((r) => r.id === 'r-aita-metformin')?.schedule).toEqual({
      kind: 'daily',
      times: ['08:30', '20:30'],
    });

    const today = startOfDay(Date.now());
    const history = await listOccurrences(db, 'p-aita', today - DEMO.historyDays * DAY, today);
    expect(history.length).toBe(DEMO.historyDays * 6); // 2 + 3 + 1 daily times
    const { rate } = adherence(history, Date.now());
    expect(rate).toBeGreaterThan(0.65);
    expect(rate).toBeLessThan(0.95);
    db.close();
  });

  it('saves, normalizes times, updates and deletes', async () => {
    const db = await freshDb();
    const id = await saveReminder(db, {
      patientId: 'p-lakhi',
      type: 'medicine',
      title: '  Vitamin D  ',
      schedule: { kind: 'daily', times: ['21:00', '9:00', '09:00'] },
    });
    expect(await getReminder(db, id)).toMatchObject({
      title: 'Vitamin D',
      enabled: true,
      schedule: { kind: 'daily', times: ['09:00', '21:00'] },
    });
    await saveReminder(db, {
      id,
      patientId: 'p-lakhi',
      type: 'medicine',
      title: 'Vitamin D3',
      schedule: { kind: 'daily', times: ['10:00'] },
      enabled: false,
    });
    expect(await getReminder(db, id)).toMatchObject({ title: 'Vitamin D3', enabled: false });
    await deleteReminder(db, id);
    expect(await getReminder(db, id)).toBeNull();
    db.close();
  });

  it('ensureEvents is idempotent and skips disabled reminders', async () => {
    const db = await freshDb();
    const from = startOfDay(Date.now()) + 7 * DAY;
    await ensureEvents(db, 'p-aita', from, from + DAY);
    await ensureEvents(db, 'p-aita', from, from + DAY);
    expect(await listOccurrences(db, 'p-aita', from, from + DAY)).toHaveLength(6);

    await saveReminder(db, {
      id: 'r-aita-water',
      patientId: 'p-aita',
      type: 'hydration',
      title: 'Water',
      schedule: { kind: 'daily', times: ['10:00'] },
      enabled: false,
    });
    const nextDay = from + DAY;
    await ensureEvents(db, 'p-aita', nextDay, nextDay + DAY);
    expect((await listOccurrences(db, 'p-aita', nextDay, nextDay + DAY)).map((o) => o.reminderId)).not.toContain(
      'r-aita-water',
    );
    db.close();
  });

  it('occurrenceFor creates the event from a notification and marks it taken', async () => {
    const db = await freshDb();
    const dueAt = startOfDay(Date.now()) + 30 * DAY + 8.5 * 3600e3;
    const occ = await occurrenceFor(db, 'r-aita-metformin', dueAt);
    expect(occ).toMatchObject({ title: 'Metformin 500 mg', status: 'pending', dueAt });
    expect((await occurrenceFor(db, 'r-aita-metformin', dueAt))?.eventId).toBe(occ!.eventId);

    await markOccurrence(db, occ!.eventId, 'taken', dueAt + 60e3);
    const [after] = await listOccurrences(db, 'p-aita', dueAt, dueAt + 1);
    expect(after).toMatchObject({ status: 'taken', actedAt: dueAt + 60e3 });
    expect(await occurrenceFor(db, 'missing', dueAt)).toBeNull();
    db.close();
  });

  it('rescheduling drops only future pending occurrences', async () => {
    const db = await freshDb();
    const now = Date.now();
    const future = startOfDay(now) + 5 * DAY;
    await ensureEvents(db, 'p-aita', future, future + DAY);
    await saveReminder(
      db,
      {
        id: 'r-aita-walk',
        patientId: 'p-aita',
        type: 'activity',
        title: 'Walk',
        schedule: { kind: 'daily', times: ['07:00'] },
      },
      now,
    );
    const occ = await listOccurrences(db, 'p-aita', future, future + DAY);
    expect(occ.filter((o) => o.reminderId === 'r-aita-walk')).toHaveLength(0);
    const past = await listOccurrences(db, 'p-aita', startOfDay(now) - 3 * DAY, startOfDay(now));
    expect(past.filter((o) => o.reminderId === 'r-aita-walk').length).toBe(3);
    db.close();
  });
});

describe('upgrade from schema v2', () => {
  it('backfills demo reminders once for installs seeded before reminders existed', async () => {
    const db = createTestDb();
    // Simulate an F05-era install: schema v2, demo seeded, no reminder tables yet.
    for (const m of MIGRATIONS.filter((x) => x.version <= 2)) {
      await db.execAsync(m.sql);
      await db.execAsync(`PRAGMA user_version = ${m.version}`);
    }
    await db.execAsync(
      "INSERT INTO household (id, name, created_at) VALUES ('h-bora', 'Bora family', 0);" +
        "INSERT INTO patient (id, household_id, name, language, created_at, updated_at) VALUES ('p-aita', 'h-bora', 'Hemoprova Bora', 'hi', 0, 0);",
    );

    await initDatabase(db);
    expect((await listReminders(db, 'p-aita')).length).toBe(4);
    await initDatabase(db); // second launch: no duplicates
    expect((await listReminders(db, 'p-aita')).length).toBe(4);

    // A caregiver deleting every reminder must not get the demo ones back.
    await db.execAsync('DELETE FROM reminder');
    await initDatabase(db);
    expect(await listReminders(db, 'p-aita')).toHaveLength(0);
    db.close();
  });
});
