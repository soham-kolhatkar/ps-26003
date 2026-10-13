/**
 * Apply a cloud people snapshot to the local database (F16): patients
 * (with a synthetic household `h-<patientId>` for village/district),
 * co-members' profiles as app_user rows, memberships as patient_user rows.
 * Patients this account no longer belongs to are removed locally, with all
 * their data (ON DELETE CASCADE). Device members (patient phones) have no
 * profile, so they are not stored locally.
 */
import type { CloudMember, PeopleSnapshot } from '@/cloud/people';
import { upsertUser } from '@/db/repos/users';
import type { DbClient } from '@/db/types';

export const householdIdFor = (patientId: string) => `h-${patientId}`;

export type ApplyResult = { patients: number; added: string[]; removed: string[] };

export async function applyPeople(db: DbClient, snap: PeopleSnapshot, now = Date.now()): Promise<ApplyResult> {
  const before = new Set((await db.getAllAsync<{ id: string }>('SELECT id FROM patient', [])).map((r) => r.id));
  const live = snap.patients.filter((p) => !p.deleted_at);
  const keep = new Set(live.map((p) => p.id));
  const staff = new Set(snap.profiles.map((p) => p.id));

  await db.withTransactionAsync(async () => {
    for (const pr of snap.profiles) await upsertUser(db, pr, now);

    for (const p of live) {
      const hid = householdIdFor(p.id);
      await db.runAsync(
        `INSERT INTO household (id, name, village, district, state, created_at) VALUES (?, ?, ?, ?, NULL, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, village = excluded.village, district = excluded.district`,
        [hid, p.name, p.village, p.district, now],
      );
      await db.runAsync(
        `INSERT INTO patient (id, household_id, name, preferred_name, age, gender, language, condition_stage,
           notes, avatar, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, preferred_name = excluded.preferred_name,
           age = excluded.age, gender = excluded.gender, language = excluded.language,
           condition_stage = excluded.condition_stage, notes = excluded.notes, avatar = excluded.avatar,
           updated_at = excluded.updated_at`,
        [
          p.id,
          hid,
          p.name,
          p.preferred_name,
          p.age,
          p.gender,
          p.language,
          p.condition_stage,
          p.notes,
          p.avatar ?? (p.gender === 'male' ? '👴' : '👵'),
          now,
          now,
        ],
      );
      // Memberships of this patient: replace with the cloud's list (staff only).
      await db.runAsync('DELETE FROM patient_user WHERE patient_id = ?', [p.id]);
      const ms = snap.members.filter((m: CloudMember) => m.patient_id === p.id && staff.has(m.user_id));
      for (const m of ms) {
        await db.runAsync(
          'INSERT INTO patient_user (patient_id, user_id, relation, member_role, is_manager) VALUES (?, ?, ?, ?, ?)',
          // No relation chosen: no tag (ASHA/doctor rows show their role as before).
          [p.id, m.user_id, m.relation ?? (m.role === 'caregiver' ? null : m.role), m.role, m.is_manager ? 1 : 0],
        );
      }
    }

    // Left / removed / deleted: drop the patient and everything about them on this phone.
    for (const id of before) {
      if (!keep.has(id)) await db.runAsync('DELETE FROM household WHERE id = ?', [householdIdFor(id)]);
    }
  });

  return {
    patients: live.length,
    added: [...keep].filter((id) => !before.has(id)),
    removed: [...before].filter((id) => !keep.has(id)),
  };
}
