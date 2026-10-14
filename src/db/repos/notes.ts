import { newId } from '../ids';
import type { DbClient } from '../types';

/** A doctor's note about a patient (F18): written by the doctor, read by the family and ASHA. */
export type DoctorNote = {
  id: string;
  patientId: string;
  authorId: string | null;
  authorName: string | null;
  body: string;
  createdAt: number;
};

type NoteRow = {
  id: string;
  patient_id: string;
  author_id: string | null;
  author_name: string | null;
  body: string;
  created_at: number;
};

export async function addDoctorNote(
  db: DbClient,
  n: { patientId: string; authorId: string | null; body: string },
  now = Date.now(),
): Promise<string> {
  const id = newId();
  await db.runAsync('INSERT INTO doctor_note (id, patient_id, author_id, body, created_at) VALUES (?, ?, ?, ?, ?)', [
    id,
    n.patientId,
    n.authorId,
    n.body.trim(),
    now,
  ]);
  return id;
}

/** Newest first, with the author's name when this phone knows them. */
export async function listDoctorNotes(db: DbClient, patientId: string, limit = 20): Promise<DoctorNote[]> {
  const rows = await db.getAllAsync<NoteRow>(
    `SELECT n.*, u.name AS author_name FROM doctor_note n LEFT JOIN app_user u ON u.id = n.author_id
     WHERE n.patient_id = ? ORDER BY n.created_at DESC LIMIT ?`,
    [patientId, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    patientId: r.patient_id,
    authorId: r.author_id,
    authorName: r.author_name,
    body: r.body,
    createdAt: r.created_at,
  }));
}

export async function deleteDoctorNote(db: DbClient, id: string): Promise<void> {
  await db.runAsync('DELETE FROM doctor_note WHERE id = ?', [id]);
}
