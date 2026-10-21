/** @jest-environment node */
import type { PeopleSnapshot } from '@/cloud/people';
import { initCloudDatabase } from '@/db/init';
import { insertSession, getLevel, listSessions, setLevel } from '@/db/repos/games';
import {
  deleteReminder,
  ensureEvents,
  listOccurrences,
  listReminders,
  markOccurrence,
  saveReminder,
} from '@/db/repos/reminders';
import { addDoctorNote, deleteDoctorNote, listDoctorNotes } from '@/db/repos/notes';
import { insertVisit, listVisits } from '@/db/repos/visits';
import { createTestDb } from '@/db/testing/nodeDb';
import type { DbClient } from '@/db/types';

import { listAlerts } from '@/db/repos/alerts';
import { refreshAlerts } from '@/services/alerts';

import { pull, push, PULL_PAGE } from '../engine';
import { pendingChanges } from '../outbox';
import { applyPeople } from '../people';
import { memoryRemote } from '../testing/memoryRemote';

const P = '11111111-1111-1111-1111-111111111111';
const CARER = 'aaaaaaaa-0000-0000-0000-000000000001';
const ASHA = 'aaaaaaaa-0000-0000-0000-000000000002';
const DAY = 24 * 3600e3;
const now = new Date(2026, 9, 14, 7, 0).getTime();
const today = new Date(2026, 9, 14).getTime();

const people: PeopleSnapshot = {
  patients: [
    {
      id: P,
      name: 'Kamala Sharma',
      preferred_name: 'Kamala',
      age: 72,
      gender: 'female',
      language: 'hi',
      condition_stage: 'mild',
      notes: null,
      avatar: null,
      village: 'Cinnamara',
      district: 'Jorhat',
      created_by: CARER,
      deleted_at: null,
    },
  ],
  members: [
    { patient_id: P, user_id: CARER, role: 'caregiver', relation: 'daughter', is_manager: true },
    { patient_id: P, user_id: ASHA, role: 'asha', relation: 'asha', is_manager: false },
  ],
  profiles: [
    { id: CARER, role: 'caregiver', name: 'Priya Sharma', phone: '+919800000001', organization: null, district: null },
    { id: ASHA, role: 'asha', name: 'Sunita Devi', phone: '+919800000002', organization: null, district: null },
  ],
};

async function phone(): Promise<DbClient> {
  const db = createTestDb();
  await initCloudDatabase(db);
  await applyPeople(db, people);
  return db;
}

const metformin = {
  patientId: P,
  type: 'medicine' as const,
  title: 'Metformin 500 mg',
  schedule: { kind: 'daily' as const, times: ['08:30'] },
  createdBy: CARER,
};

describe('sync engine (two phones through the cloud)', () => {
  it("a caregiver's reminder reaches the patient's phone; the dose taken there reaches the caregiver", async () => {
    const cloud = memoryRemote();
    const carer = await phone();
    const patient = await phone();

    const rid = await saveReminder(carer, metformin, now);
    await ensureEvents(carer, P, today, today + DAY); // pending doses: never pushed
    expect(await pendingChanges(carer)).toBe(1);
    expect(await push(carer, cloud)).toEqual({ pushed: 1, dropped: 0 });
    expect(await pendingChanges(carer)).toBe(0);

    const r1 = await pull(patient, cloud, now);
    expect(r1).toMatchObject({ applied: 1, remindersChanged: true });
    expect((await listReminders(patient, P))[0].title).toBe('Metformin 500 mg');
    expect(await pendingChanges(patient)).toBe(0); // pulled rows are not echoed back

    await ensureEvents(patient, P, today, today + DAY);
    const [dose] = await listOccurrences(patient, P, today, today + DAY);
    expect(dose.eventId).toBe(`${rid}:${dose.dueAt}`); // same id on every phone
    await markOccurrence(patient, dose.eventId, 'taken', now + 3600e3);
    expect((await push(patient, cloud)).pushed).toBe(1);

    await pull(carer, cloud, now);
    const [seen] = await listOccurrences(carer, P, today, today + DAY);
    expect(seen).toMatchObject({ eventId: dose.eventId, status: 'taken' });
  });

  it("the patient phone's games and levels reach the caregiver's dashboard data", async () => {
    const cloud = memoryRemote();
    const carer = await phone();
    const patient = await phone();
    const stats = { trials: 6, correct: 5, accuracy: 5 / 6, avgReactionMs: 1800, score: 80 };
    await insertSession(patient, {
      patientId: P,
      gameId: 'memory_match',
      level: 2,
      startedAt: now,
      endedAt: now + 9e4,
      stats,
      completed: true,
    });
    await setLevel(patient, P, 'memory_match', 3, now + 9e4);
    await push(patient, cloud);
    await pull(carer, cloud, now);
    expect(await listSessions(carer, P)).toHaveLength(1);
    expect(await getLevel(carer, P, 'memory_match')).toBe(3);
  });

  it("an ASHA visit reaches the caregiver; a person the phone doesn't know becomes null", async () => {
    const cloud = memoryRemote();
    const ashaPhone = await phone();
    const carer = createTestDb();
    await initCloudDatabase(carer);
    await applyPeople(carer, { ...people, profiles: people.profiles.filter((p) => p.id !== ASHA) });
    await insertVisit(ashaPhone, {
      patientId: P,
      userId: ASHA,
      startedAt: now,
      endedAt: now + 6e5,
      checkup: null,
      checkupScore: null,
      observations: { sleep: 'poor' },
      note: 'Sleeping badly',
      refer: true,
      nextVisitAt: now + 7 * DAY,
    });
    await push(ashaPhone, cloud);
    await pull(carer, cloud, now);
    const [v] = await listVisits(carer, P);
    expect(v).toMatchObject({ note: 'Sleeping badly', refer: true, userId: null, observations: { sleep: 'poor' } });
  });

  it("a doctor's note reaches the family; deleting it removes it there too", async () => {
    const cloud = memoryRemote();
    const doctor = await phone();
    const carer = await phone();
    const id = await addDoctorNote(doctor, { patientId: P, authorId: CARER, body: 'Check BP weekly.' }, now);
    await push(doctor, cloud);
    await pull(carer, cloud, now);
    expect((await listDoctorNotes(carer, P))[0]).toMatchObject({
      body: 'Check BP weekly.',
      authorName: 'Priya Sharma',
    });
    await deleteDoctorNote(doctor, id);
    await push(doctor, cloud);
    await pull(carer, cloud, now);
    expect(await listDoctorNotes(carer, P)).toEqual([]);
  });

  it('another phone counts untaken doses as missed (only taken doses travel), never before the reminder existed', async () => {
    const cloud = memoryRemote();
    const patient = await phone();
    const created = now - 10 * DAY;
    await saveReminder(patient, { ...metformin, schedule: { kind: 'daily', times: ['09:00'] } }, created);
    // The patient took the medicine on 2 of the last 7 days.
    await ensureEvents(patient, P, today - 7 * DAY, today);
    const week = await listOccurrences(patient, P, today - 7 * DAY, today);
    for (const o of week.slice(0, 2)) await markOccurrence(patient, o.eventId, 'taken', o.dueAt + 6e5);
    await push(patient, cloud);

    const carer = await phone();
    await pull(carer, cloud, now);
    expect(await listOccurrences(carer, P, today - 30 * DAY, today)).toHaveLength(2); // only what travelled
    await refreshAlerts(carer, P, now); // fills in the scheduled doses for its window
    expect(await listOccurrences(carer, P, today - 30 * DAY, today)).toHaveLength(10); // 10 days since created, not 30
    expect((await listAlerts(carer, P)).map((a) => a.kind)).toContain('adherence_low');
  });

  it('a local edit made before the pull is not overwritten, and wins on the next push', async () => {
    const cloud = memoryRemote();
    const carer = await phone();
    const asha = await phone();
    const rid = await saveReminder(carer, metformin, now);
    await push(carer, cloud);
    await pull(asha, cloud, now);

    await saveReminder(asha, { ...metformin, id: rid, title: 'Metformin 1000 mg' }, now + 1000); // unpushed
    await saveReminder(carer, { ...metformin, id: rid, title: 'Metformin 250 mg' }, now + 2000);
    await push(carer, cloud);
    await pull(asha, cloud, now);
    expect((await listReminders(asha, P))[0].title).toBe('Metformin 1000 mg');
    await push(asha, cloud);
    await pull(carer, cloud, now);
    expect((await listReminders(carer, P))[0].title).toBe('Metformin 1000 mg');
  });

  it('a dose taken on one phone is never turned back to pending by another', async () => {
    const cloud = memoryRemote();
    const patient = await phone();
    const rid = await saveReminder(patient, metformin, now);
    await ensureEvents(patient, P, today, today + DAY);
    const [dose] = await listOccurrences(patient, P, today, today + DAY);
    await markOccurrence(patient, dose.eventId, 'taken', now);
    await push(patient, cloud);
    // A late "pending" upsert of the same dose (server rule keeps it taken).
    await cloud.upsert({ cloud: 'reminder_events' } as never, [
      { id: dose.eventId, reminder_id: rid, patient_id: P, due_at: dose.dueAt, status: 'pending', acted_at: null },
    ]);
    const other = await phone();
    await pull(other, cloud, now);
    expect((await listOccurrences(other, P, today, today + DAY))[0].status).toBe('taken');
  });

  it('deleting a reminder removes it (and its doses) on the other phones', async () => {
    const cloud = memoryRemote();
    const carer = await phone();
    const patient = await phone();
    const rid = await saveReminder(carer, metformin, now);
    await push(carer, cloud);
    await pull(patient, cloud, now);
    await ensureEvents(patient, P, today, today + DAY);
    await deleteReminder(carer, rid);
    await push(carer, cloud);
    const r = await pull(patient, cloud, now);
    expect(r.remindersChanged).toBe(true);
    expect(await listReminders(patient, P)).toEqual([]);
    expect(await listOccurrences(patient, P, today, today + DAY)).toEqual([]);
  });

  it('a dose whose reminder has not arrived yet is held and applied on a later pull', async () => {
    const cloud = memoryRemote();
    const patient = await phone();
    const dueAt = today + 8.5 * 3600e3;
    await cloud.upsert({ cloud: 'reminder_events' } as never, [
      { id: `r-x:${dueAt}`, reminder_id: 'r-x', patient_id: P, due_at: dueAt, status: 'taken', acted_at: dueAt },
    ]);
    expect((await pull(patient, cloud, now)).held).toBe(1);
    await cloud.upsert({ cloud: 'reminders', onConflict: 'id' } as never, [
      {
        id: 'r-x',
        patient_id: P,
        type: 'medicine',
        title: 'Amlodipine',
        note: null,
        schedule_kind: 'daily',
        times: '08:30',
        once_at: null,
        enabled: true,
        created_by: null,
        created_at: now,
        client_updated_at: now,
        deleted_at: null,
      },
    ]);
    const r2 = await pull(patient, cloud, now);
    expect(r2.held).toBe(0);
    expect((await listOccurrences(patient, P, today, today + DAY))[0]).toMatchObject({ status: 'taken' });
  });

  it('pages through more rows than one request returns, even with one shared timestamp', async () => {
    const cloud = memoryRemote();
    const n = PULL_PAGE * 2 + 37;
    // One statement (e.g. the demo upload) → every row shares one server timestamp.
    await cloud.upsert(
      { cloud: 'game_sessions', insertOnly: true } as never,
      Array.from({ length: n }, (_, i) => ({
        id: `s-${String(i).padStart(5, '0')}`,
        patient_id: P,
        game_id: 'pattern',
        level: 1,
        started_at: now - i * 6e4,
        ended_at: now - i * 6e4 + 3e4,
        trials: 6,
        correct: 6,
        accuracy: 1,
        avg_reaction_ms: 1000,
        score: 95,
        completed: true,
        source: 'seed',
      })),
    );
    const carer = await phone();
    const r = await pull(carer, cloud, now);
    expect(r.applied).toBe(n);
    expect(await listSessions(carer, P, { limit: 5000 })).toHaveLength(n);
  });

  it('keeps changes queued when offline, drops changes the cloud refuses', async () => {
    const cloud = memoryRemote();
    const carer = await phone();
    await saveReminder(carer, metformin, now);
    cloud.failWith(new TypeError('Network request failed'));
    await expect(push(carer, cloud)).rejects.toThrow('Network request failed');
    expect(await pendingChanges(carer)).toBe(1);

    cloud.failWith({ code: '42501', message: 'new row violates row-level security policy' });
    expect(await push(carer, cloud)).toEqual({ pushed: 0, dropped: 1 });
    expect(await pendingChanges(carer)).toBe(0);
  });
});
