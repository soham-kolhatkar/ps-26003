import { newId } from '../ids';
import type { DbClient } from '../types';

/** Someone the patient's SOS button can call: family linked to the patient, with a number on this phone. */
export type FamilyContact = {
  userId: string;
  name: string;
  phone: string;
  relation: string | null;
  avatar: string | null;
  isManager: boolean;
};

/** Family first by manager, then by name (ASHA and doctor are not called from the SOS button). */
export async function listFamilyContacts(db: DbClient, patientId: string): Promise<FamilyContact[]> {
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    phone: string;
    relation: string | null;
    avatar: string | null;
    is_manager: number;
  }>(
    `SELECT u.id, u.name, u.phone, pu.relation, u.avatar, pu.is_manager
     FROM patient_user pu JOIN app_user u ON u.id = pu.user_id
     WHERE pu.patient_id = ? AND u.role = 'caregiver' AND u.phone IS NOT NULL AND u.phone <> ''
     ORDER BY pu.is_manager DESC, u.name`,
    [patientId],
  );
  return rows.map((r) => ({
    userId: r.id,
    name: r.name,
    phone: r.phone,
    relation: r.relation,
    avatar: r.avatar,
    isManager: r.is_manager === 1,
  }));
}

export type SosEvent = {
  id: string;
  patientId: string;
  patientName: string;
  calledName: string | null;
  createdAt: number;
};

/** The patient pressed SOS (and is calling `calledUserId`). Synced to the care team (SQL 006). */
export async function recordSos(
  db: DbClient,
  e: { patientId: string; calledUserId: string | null },
  now = Date.now(),
): Promise<string> {
  const id = newId();
  await db.runAsync('INSERT INTO sos_event (id, patient_id, called_user_id, created_at) VALUES (?, ?, ?, ?)', [
    id,
    e.patientId,
    e.calledUserId,
    now,
  ]);
  return id;
}

/** SOS presses since `since` that this phone has not dismissed yet, newest first. */
export async function listUnseenSos(db: DbClient, patientIds: readonly string[], since: number): Promise<SosEvent[]> {
  if (!patientIds.length) return [];
  const rows = await db.getAllAsync<{
    id: string;
    patient_id: string;
    patient_name: string;
    called_name: string | null;
    created_at: number;
  }>(
    `SELECT s.id, s.patient_id, COALESCE(p.preferred_name, p.name) AS patient_name, u.name AS called_name, s.created_at
     FROM sos_event s JOIN patient p ON p.id = s.patient_id LEFT JOIN app_user u ON u.id = s.called_user_id
     WHERE s.patient_id IN (${patientIds.map(() => '?').join(', ')}) AND s.created_at >= ? AND s.seen_at IS NULL
     ORDER BY s.created_at DESC`,
    [...patientIds, since],
  );
  return rows.map((r) => ({
    id: r.id,
    patientId: r.patient_id,
    patientName: r.patient_name,
    calledName: r.called_name,
    createdAt: r.created_at,
  }));
}

/** Dismiss banners on this phone only (seen_at is never synced). */
export async function markSosSeen(db: DbClient, ids: readonly string[], now = Date.now()): Promise<void> {
  if (!ids.length) return;
  await db.runAsync(`UPDATE sos_event SET seen_at = ? WHERE id IN (${ids.map(() => '?').join(', ')})`, [now, ...ids]);
}
