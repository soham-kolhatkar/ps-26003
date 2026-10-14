/** @jest-environment node */
import type { PeopleSnapshot } from '@/cloud/people';
import { initCloudDatabase } from '@/db/init';
import { getPatient, listPatientsForUser } from '@/db/repos/patients';
import { createTestDb } from '@/db/testing/nodeDb';

import { applyPeople } from '../people';

const patient = (id: string, name: string) => ({
  id,
  name,
  preferred_name: null,
  age: 72,
  gender: 'female' as const,
  language: 'hi',
  condition_stage: 'mild' as const,
  notes: null,
  avatar: null,
  village: 'Cinnamara',
  district: 'Jorhat',
  created_by: 'u-rim',
  deleted_at: null,
});

const snap = (over: Partial<PeopleSnapshot> = {}): PeopleSnapshot => ({
  patients: [patient('p1', 'Hemoprova Bora')],
  members: [
    { patient_id: 'p1', user_id: 'u-rim', role: 'caregiver', relation: 'daughter', is_manager: true },
    { patient_id: 'p1', user_id: 'u-asha', role: 'asha', relation: 'asha', is_manager: false },
    { patient_id: 'p1', user_id: 'anon-phone', role: 'device', relation: null, is_manager: false },
  ],
  profiles: [
    {
      id: 'u-rim',
      role: 'caregiver',
      name: 'Rimjhim Bora',
      phone: '+919800000001',
      organization: null,
      district: 'Jorhat',
    },
    {
      id: 'u-asha',
      role: 'asha',
      name: 'Pranita Das',
      phone: '+919800000002',
      organization: 'Cinnamara SC',
      district: 'Jorhat',
    },
  ],
  ...over,
});

describe('applyPeople', () => {
  it('stores patients, co-members and memberships so the existing screens work', async () => {
    const db = createTestDb();
    await initCloudDatabase(db);
    const r = await applyPeople(db, snap());
    expect(r).toEqual({ patients: 1, added: ['p1'], removed: [] });
    expect(await getPatient(db, 'p1')).toMatchObject({ name: 'Hemoprova Bora', village: 'Cinnamara', avatar: '👵' });
    expect((await listPatientsForUser(db, 'u-rim'))[0]).toMatchObject({ id: 'p1', relation: 'daughter' });
    expect((await listPatientsForUser(db, 'u-asha'))[0].relation).toBe('asha');
    // A caregiver who chose no relation gets no tag (not the raw word "caregiver").
    const noRel = snap();
    noRel.members[0].relation = null;
    await applyPeople(db, noRel);
    expect((await listPatientsForUser(db, 'u-rim'))[0].relation).toBeNull();
    // The patient's phone (anonymous) is not a local user.
    expect((await db.getAllAsync('SELECT * FROM patient_user WHERE user_id = ?', ['anon-phone'])).length).toBe(0);
    const row = await db.getFirstAsync<{ member_role: string; is_manager: number }>(
      'SELECT member_role, is_manager FROM patient_user WHERE user_id = ?',
      ['u-rim'],
    );
    expect(row).toEqual({ member_role: 'caregiver', is_manager: 1 });
    db.close();
  });

  it('is idempotent and follows changes (renamed patient, removed member)', async () => {
    const db = createTestDb();
    await initCloudDatabase(db);
    await applyPeople(db, snap());
    await applyPeople(db, snap());
    const s = snap();
    s.patients[0].name = 'Hemoprova B.';
    s.members = s.members.filter((m) => m.user_id !== 'u-asha');
    const r = await applyPeople(db, s);
    expect(r.added).toEqual([]);
    expect((await getPatient(db, 'p1'))?.name).toBe('Hemoprova B.');
    expect(await listPatientsForUser(db, 'u-asha')).toEqual([]);
    db.close();
  });

  it('removes a patient (and their data) when this account no longer belongs to them', async () => {
    const db = createTestDb();
    await initCloudDatabase(db);
    await applyPeople(db, snap());
    await db.runAsync(
      `INSERT INTO game_session (id, patient_id, game_id, level, started_at, ended_at, trials, correct, accuracy,
         avg_reaction_ms, score, completed) VALUES ('s1', 'p1', 'memory_match', 1, 0, 1, 6, 6, 1, 900, 95, 1)`,
      [],
    );
    const r = await applyPeople(db, snap({ patients: [], members: [] }));
    expect(r.removed).toEqual(['p1']);
    expect(await getPatient(db, 'p1')).toBeNull();
    expect((await db.getAllAsync('SELECT * FROM game_session', [])).length).toBe(0);
    db.close();
  });
});
